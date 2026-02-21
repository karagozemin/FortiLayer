// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BasePolicy.sol";

/**
 * @title RiskScorePolicy
 * @author FortiLayer
 * @notice Blocks transactions to addresses with high risk scores (institutional compliance).
 * @dev Maintains a risk score mapping for external protocol addresses. Addresses below
 *      the minimum threshold are blocked from receiving funds. This enables:
 *      - Sanctioned address blocking
 *      - Protocol risk assessment (block transfers to high-risk DeFi protocols)
 *      - Dynamic risk management based on on-chain/off-chain data
 *
 * Scoring:
 *   - Score range: 0-100 (0 = highest risk, 100 = lowest risk)
 *   - Default score for unknown addresses is configurable
 *   - Minimum threshold: addresses with score < threshold are blocked
 *
 * Integration:
 *   - Risk scores can be updated by oracle integrations or manual admin review
 *   - Supports batch updates for efficiency
 */
contract RiskScorePolicy is BasePolicy {
    // ══════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Thrown when a recipient's risk score is below the threshold.
    error RiskScoreTooLow(address recipient, uint256 score, uint256 threshold);

    /// @notice Thrown when setting an invalid score (>100).
    error InvalidScore(uint256 score);

    /// @notice Thrown when setting an invalid threshold (>100).
    error InvalidThreshold(uint256 threshold);

    // ══════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ══════════════════════════════════════════════════════════════════════════

    event RiskScoreUpdated(address indexed target, uint256 score);
    event MinThresholdUpdated(uint256 newThreshold);
    event DefaultScoreUpdated(uint256 newDefaultScore);

    // ══════════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ══════════════════════════════════════════════════════════════════════════

    uint256 public constant MAX_SCORE = 100;

    // ══════════════════════════════════════════════════════════════════════════
    //                              STORAGE
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Minimum risk score required for a recipient to receive funds
    uint256 public minThreshold;

    /// @notice Default score assigned to unknown addresses
    uint256 public defaultScore;

    /// @dev address => risk score (0-100, higher = safer)
    mapping(address => uint256) private _riskScores;

    /// @dev address => whether a custom score has been set
    mapping(address => bool) private _hasCustomScore;

    // ══════════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @param _policyEngine The PolicyEngine contract address.
     * @param _minThreshold Minimum risk score required (0-100).
     * @param _defaultScore Default score for unscored addresses (0-100).
     */
    constructor(
        address _policyEngine,
        uint256 _minThreshold,
        uint256 _defaultScore
    ) BasePolicy(_policyEngine) {
        if (_minThreshold > MAX_SCORE) revert InvalidThreshold(_minThreshold);
        if (_defaultScore > MAX_SCORE) revert InvalidScore(_defaultScore);

        minThreshold = _minThreshold;
        defaultScore = _defaultScore;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           POLICY NAME
    // ══════════════════════════════════════════════════════════════════════════

    function policyName() external pure override returns (string memory) {
        return "RiskScorePolicy";
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           VALIDATION
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Validates that the recipient has an acceptable risk score.
     * @dev Returns true if the recipient's score >= minThreshold.
     */
    function validate(
        address /* vault */,
        address /* token */,
        address to,
        uint256 /* amount */
    ) external view override returns (bool) {
        uint256 score = getRiskScore(to);

        if (score < minThreshold) {
            revert RiskScoreTooLow(to, score, minThreshold);
        }

        return true;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                        RISK SCORE MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Sets the risk score for a single address.
    function setRiskScore(address target, uint256 score) external onlyOwner {
        if (target == address(0)) revert ZeroAddress();
        if (score > MAX_SCORE) revert InvalidScore(score);

        _riskScores[target] = score;
        _hasCustomScore[target] = true;

        emit RiskScoreUpdated(target, score);
    }

    /// @notice Batch-sets risk scores for multiple addresses.
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

    // ══════════════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Returns the risk score for an address.
    function getRiskScore(address target) public view returns (uint256) {
        if (_hasCustomScore[target]) {
            return _riskScores[target];
        }
        return defaultScore;
    }

    /// @notice Returns whether an address has a custom risk score set.
    function hasCustomScore(address target) external view returns (bool) {
        return _hasCustomScore[target];
    }

    /// @notice Returns whether an address would pass the risk check.
    function wouldPass(address target) external view returns (bool) {
        return getRiskScore(target) >= minThreshold;
    }
}
