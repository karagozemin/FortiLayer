// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BasePolicy.sol";
import "../interfaces/IChainlinkFeed.sol";

/**
 * @title OracleRiskScorePolicy
 * @author FortiLayer
 * @notice Risk scoring policy powered by REAL Chainlink oracle data on Arbitrum Sepolia.
 *
 * @dev Dual-mode risk assessment:
 *   1. Oracle-derived risk: Uses Chainlink ETH/USD price feed to detect market volatility.
 *      - Compares current price against a cached "anchor" price.
 *      - High deviation = market stress → lower oracle score → stricter controls.
 *   2. Manual override: Admin can still assign per-address risk scores.
 *      - The LOWER of (oracle score, manual score) is used → conservative approach.
 *
 * Scoring:
 *   - Score range: 0-100 (0 = highest risk, 100 = safest)
 *   - Default score for unknown addresses is configurable
 *   - Oracle score derived from price deviation bands:
 *       deviation < 2%  → score 100 (normal market)
 *       deviation 2-5%  → score 70  (mild volatility)
 *       deviation 5-10% → score 40  (high volatility)
 *       deviation > 10% → score 10  (extreme / potential exploit)
 *   - Stale oracle data (> staleness threshold) → falls back to manual score only
 *
 * Architecture:
 *   This is NOT a mock — it reads REAL Chainlink ETH/USD data from:
 *   Arbitrum Sepolia: 0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165
 */
contract OracleRiskScorePolicy is BasePolicy {
    // ══════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    error RiskScoreTooLow(address recipient, uint256 score, uint256 threshold);
    error InvalidScore(uint256 score);
    error InvalidThreshold(uint256 threshold);
    error StaleOracleData(uint256 updatedAt, uint256 currentTime);
    error InvalidOraclePrice(int256 price);
    error OracleCallFailed();

    // ══════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ══════════════════════════════════════════════════════════════════════════

    event RiskScoreUpdated(address indexed target, uint256 score);
    event MinThresholdUpdated(uint256 newThreshold);
    event DefaultScoreUpdated(uint256 newDefaultScore);
    event OracleFeedUpdated(address indexed newFeed);
    event AnchorPriceUpdated(int256 newAnchorPrice, uint256 timestamp);
    event StalenessThresholdUpdated(uint256 newThreshold);
    event OracleScoreCalculated(uint256 deviation, uint256 oracleScore);

    // ══════════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ══════════════════════════════════════════════════════════════════════════

    uint256 public constant MAX_SCORE = 100;

    /// @notice Deviation bands (basis points, 1 bp = 0.01%)
    uint256 public constant BAND_NORMAL = 200;    // < 2% deviation → score 100
    uint256 public constant BAND_MILD = 500;      // 2-5% → score 70
    uint256 public constant BAND_HIGH = 1000;     // 5-10% → score 40
    // > 10% → score 10 (extreme)

    // ══════════════════════════════════════════════════════════════════════════
    //                              STORAGE
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Chainlink price feed (ETH/USD on Arbitrum Sepolia)
    IChainlinkFeed public priceFeed;

    /// @notice Anchor price — baseline for deviation calculation
    int256 public anchorPrice;

    /// @notice Timestamp when anchor was last set
    uint256 public anchorTimestamp;

    /// @notice Maximum age of oracle data before it's considered stale (seconds)
    uint256 public stalenessThreshold;

    /// @notice Minimum risk score required for a recipient to receive funds
    uint256 public minThreshold;

    /// @notice Default score assigned to unknown addresses (manual mode)
    uint256 public defaultScore;

    /// @notice Whether oracle mode is active (can be disabled as fallback)
    bool public oracleEnabled;

    /// @dev address => manual risk score (0-100, higher = safer)
    mapping(address => uint256) private _riskScores;

    /// @dev address => whether a custom manual score has been set
    mapping(address => bool) private _hasCustomScore;

    // ══════════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @param _policyEngine The PolicyEngine contract address.
     * @param _priceFeed Chainlink price feed address (ETH/USD).
     * @param _minThreshold Minimum risk score required (0-100).
     * @param _defaultScore Default score for unscored addresses (0-100).
     * @param _stalenessThreshold Max oracle data age in seconds (e.g., 86400 for 1 day).
     */
    constructor(
        address _policyEngine,
        address _priceFeed,
        uint256 _minThreshold,
        uint256 _defaultScore,
        uint256 _stalenessThreshold
    ) BasePolicy(_policyEngine) {
        if (_priceFeed == address(0)) revert ZeroAddress();
        if (_minThreshold > MAX_SCORE) revert InvalidThreshold(_minThreshold);
        if (_defaultScore > MAX_SCORE) revert InvalidScore(_defaultScore);

        priceFeed = IChainlinkFeed(_priceFeed);
        minThreshold = _minThreshold;
        defaultScore = _defaultScore;
        stalenessThreshold = _stalenessThreshold;
        oracleEnabled = true;

        // Set initial anchor price from live feed
        _refreshAnchorPrice();
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           POLICY NAME
    // ══════════════════════════════════════════════════════════════════════════

    function policyName() external pure override returns (string memory) {
        return "OracleRiskScorePolicy";
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           VALIDATION
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Validates that the recipient passes risk assessment.
     * @dev Uses dual-mode: min(oracle_score, manual_score) must be >= threshold.
     *      If oracle is disabled or stale, falls back to manual score only.
     */
    function validate(
        address /* vault */,
        address /* token */,
        address to,
        uint256 /* amount */
    ) external view override returns (bool) {
        uint256 score = getEffectiveScore(to);

        if (score < minThreshold) {
            revert RiskScoreTooLow(to, score, minThreshold);
        }

        return true;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                        ORACLE SCORE CALCULATION
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Calculates the oracle-derived risk score based on price deviation.
     * @dev Compares current Chainlink price against the anchor price.
     * @return score The oracle risk score (0-100).
     * @return isStale Whether the oracle data is stale.
     */
    function getOracleScore() public view returns (uint256 score, bool isStale) {
        if (!oracleEnabled || anchorPrice <= 0) {
            return (MAX_SCORE, true); // Fallback: oracle not usable
        }

        try priceFeed.latestRoundData() returns (
            uint80,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80
        ) {
            // Check staleness
            if (block.timestamp - updatedAt > stalenessThreshold) {
                return (MAX_SCORE, true);
            }

            // Check valid price
            if (answer <= 0) {
                return (MAX_SCORE, true);
            }

            // Calculate absolute deviation in basis points
            uint256 deviation = _calculateDeviation(answer, anchorPrice);

            // Map deviation to risk score
            if (deviation <= BAND_NORMAL) {
                score = 100; // Normal market conditions
            } else if (deviation <= BAND_MILD) {
                score = 70;  // Mild volatility
            } else if (deviation <= BAND_HIGH) {
                score = 40;  // High volatility
            } else {
                score = 10;  // Extreme conditions
            }

            return (score, false);
        } catch {
            return (MAX_SCORE, true); // Oracle call failed — fallback
        }
    }

    /**
     * @notice Returns the effective score for an address (min of oracle + manual).
     * @param target The address to score.
     * @return The effective risk score.
     */
    function getEffectiveScore(address target) public view returns (uint256) {
        uint256 manualScore = _getManualScore(target);

        (uint256 oracleScore, bool isStale) = getOracleScore();

        // If oracle is stale, use manual score only
        if (isStale) {
            return manualScore;
        }

        // Conservative: use the LOWER of the two scores
        return manualScore < oracleScore ? manualScore : oracleScore;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                       MANUAL SCORE MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Sets the manual risk score for a single address.
    function setRiskScore(address target, uint256 score) external onlyOwner {
        if (target == address(0)) revert ZeroAddress();
        if (score > MAX_SCORE) revert InvalidScore(score);

        _riskScores[target] = score;
        _hasCustomScore[target] = true;

        emit RiskScoreUpdated(target, score);
    }

    /// @notice Batch-sets manual risk scores for multiple addresses.
    function batchSetRiskScores(
        address[] calldata targets,
        uint256[] calldata scores
    ) external onlyOwner {
        require(targets.length == scores.length, "Length mismatch");

        for (uint256 i = 0; i < targets.length; ) {
            if (targets[i] == address(0)) revert ZeroAddress();
            if (scores[i] > MAX_SCORE) revert InvalidScore(scores[i]);

            _riskScores[targets[i]] = scores[i];
            _hasCustomScore[targets[i]] = true;

            emit RiskScoreUpdated(targets[i], scores[i]);
            unchecked { ++i; }
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                        ADMIN CONFIGURATION
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Updates the minimum threshold.
    function setMinThreshold(uint256 _minThreshold) external onlyOwner {
        if (_minThreshold > MAX_SCORE) revert InvalidThreshold(_minThreshold);
        minThreshold = _minThreshold;
        emit MinThresholdUpdated(_minThreshold);
    }

    /// @notice Updates the default score for unknown addresses.
    function setDefaultScore(uint256 _defaultScore) external onlyOwner {
        if (_defaultScore > MAX_SCORE) revert InvalidScore(_defaultScore);
        defaultScore = _defaultScore;
        emit DefaultScoreUpdated(_defaultScore);
    }

    /// @notice Updates the Chainlink price feed address.
    function setPriceFeed(address _priceFeed) external onlyOwner {
        if (_priceFeed == address(0)) revert ZeroAddress();
        priceFeed = IChainlinkFeed(_priceFeed);
        emit OracleFeedUpdated(_priceFeed);
    }

    /// @notice Refreshes the anchor price from the current oracle price.
    /// @dev Should be called periodically (e.g., daily) to update baseline.
    function refreshAnchorPrice() external onlyOwner {
        _refreshAnchorPrice();
    }

    /// @notice Updates the staleness threshold for oracle data.
    function setStalenessThreshold(uint256 _stalenessThreshold) external onlyOwner {
        stalenessThreshold = _stalenessThreshold;
        emit StalenessThresholdUpdated(_stalenessThreshold);
    }

    /// @notice Enables or disables oracle mode.
    function setOracleEnabled(bool _enabled) external onlyOwner {
        oracleEnabled = _enabled;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Returns the manual risk score for an address.
    function getManualScore(address target) external view returns (uint256) {
        return _getManualScore(target);
    }

    /// @notice Returns whether an address has a custom manual score.
    function hasCustomScore(address target) external view returns (bool) {
        return _hasCustomScore[target];
    }

    /// @notice Returns whether an address would pass the risk check.
    function wouldPass(address target) external view returns (bool) {
        return getEffectiveScore(target) >= minThreshold;
    }

    /// @notice Returns the current live price from the Chainlink feed.
    function getLatestPrice() external view returns (int256 price, uint256 updatedAt) {
        (, price,, updatedAt,) = priceFeed.latestRoundData();
    }

    /// @notice Returns the current price deviation from anchor in basis points.
    function getCurrentDeviation() external view returns (uint256) {
        (, int256 answer,,,) = priceFeed.latestRoundData();
        if (answer <= 0 || anchorPrice <= 0) return 0;
        return _calculateDeviation(answer, anchorPrice);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                         INTERNAL FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    function _getManualScore(address target) internal view returns (uint256) {
        if (_hasCustomScore[target]) {
            return _riskScores[target];
        }
        return defaultScore;
    }

    function _refreshAnchorPrice() internal {
        (, int256 answer,, uint256 updatedAt,) = priceFeed.latestRoundData();

        if (answer <= 0) revert InvalidOraclePrice(answer);
        if (block.timestamp - updatedAt > stalenessThreshold) {
            revert StaleOracleData(updatedAt, block.timestamp);
        }

        anchorPrice = answer;
        anchorTimestamp = block.timestamp;

        emit AnchorPriceUpdated(answer, block.timestamp);
    }

    /**
     * @dev Calculates absolute deviation between two prices in basis points.
     *      deviation_bp = |current - anchor| * 10000 / anchor
     */
    function _calculateDeviation(
        int256 currentPrice,
        int256 _anchorPrice
    ) internal pure returns (uint256) {
        int256 diff = currentPrice - _anchorPrice;
        if (diff < 0) diff = -diff;

        // Convert to basis points (10000 = 100%)
        return uint256(diff * 10000 / _anchorPrice);
    }
}
