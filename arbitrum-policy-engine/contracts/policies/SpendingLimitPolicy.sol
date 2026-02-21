// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BasePolicy.sol";

/**
 * @title SpendingLimitPolicy
 * @author FortiLayer
 * @notice Enforces daily and per-transaction spending limits on treasury outflows.
 * @dev Tracks cumulative daily spending per vault using a 24-hour rolling window.
 *      The daily limit resets automatically when the current day changes.
 *
 * Features:
 *   - Per-vault daily spending limit (configurable)
 *   - Per-transaction maximum amount
 *   - Automatic 24-hour window reset
 *   - Gas-efficient day tracking using block.timestamp / 1 days
 *
 * Security:
 *   - Only the PolicyEngine can record transactions (prevent bypass)
 *   - Only the policy owner can modify limits
 *   - Uses unchecked math only where overflow is impossible
 */
contract SpendingLimitPolicy is BasePolicy {
    // ══════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Thrown when a single transaction exceeds the per-tx maximum.
    error ExceedsMaxTransactionAmount(uint256 amount, uint256 maxAmount);

    /// @notice Thrown when cumulative daily spending would exceed the daily limit.
    error ExceedsDailyLimit(uint256 currentSpent, uint256 amount, uint256 dailyLimit);

    /// @notice Thrown when setting an invalid limit.
    error InvalidLimit();

    // ══════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ══════════════════════════════════════════════════════════════════════════

    event DailyLimitUpdated(address indexed vault, uint256 newLimit);
    event MaxTransactionAmountUpdated(address indexed vault, uint256 newMax);
    event DefaultDailyLimitUpdated(uint256 newLimit);
    event DefaultMaxTxAmountUpdated(uint256 newMax);

    // ══════════════════════════════════════════════════════════════════════════
    //                              STORAGE
    // ══════════════════════════════════════════════════════════════════════════

    /// @dev Daily spending tracking per vault
    struct DailySpending {
        uint256 spent;       // Amount spent in current day window
        uint256 dayStart;    // The day number (timestamp / 1 days)
    }

    /// @notice Default daily limit for new vaults
    uint256 public defaultDailyLimit;

    /// @notice Default max transaction amount for new vaults
    uint256 public defaultMaxTxAmount;

    /// @dev vault => daily spending state
    mapping(address => DailySpending) private _dailySpending;

    /// @dev vault => custom daily limit (0 = use default)
    mapping(address => uint256) public vaultDailyLimits;

    /// @dev vault => custom max tx amount (0 = use default)
    mapping(address => uint256) public vaultMaxTxAmounts;

    // ══════════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @param _policyEngine The PolicyEngine contract address.
     * @param _defaultDailyLimit Default daily spending limit (in token decimals).
     * @param _defaultMaxTxAmount Default max single transaction amount.
     */
    constructor(
        address _policyEngine,
        uint256 _defaultDailyLimit,
        uint256 _defaultMaxTxAmount
    ) BasePolicy(_policyEngine) {
        if (_defaultDailyLimit == 0 || _defaultMaxTxAmount == 0) revert InvalidLimit();
        defaultDailyLimit = _defaultDailyLimit;
        defaultMaxTxAmount = _defaultMaxTxAmount;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           POLICY NAME
    // ══════════════════════════════════════════════════════════════════════════

    function policyName() external pure override returns (string memory) {
        return "SpendingLimitPolicy";
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           VALIDATION
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Validates that a transaction does not exceed spending limits.
     * @dev Checks both per-transaction maximum and cumulative daily limit.
     *      Does NOT modify state — state tracking happens in recordTransaction.
     */
    function validate(
        address vault,
        address /* token */,
        address /* to */,
        uint256 amount
    ) external view override returns (bool) {
        uint256 maxTx = _getMaxTxAmount(vault);
        if (amount > maxTx) {
            revert ExceedsMaxTransactionAmount(amount, maxTx);
        }

        uint256 limit = _getDailyLimit(vault);
        uint256 currentDay = block.timestamp / 1 days;
        DailySpending storage ds = _dailySpending[vault];

        uint256 currentSpent = ds.dayStart == currentDay ? ds.spent : 0;

        if (currentSpent + amount > limit) {
            revert ExceedsDailyLimit(currentSpent, amount, limit);
        }

        return true;
    }

    /**
     * @notice Records a completed transaction for daily limit tracking.
     * @dev Automatically resets the daily counter when a new day starts.
     */
    function recordTransaction(
        address vault,
        address /* token */,
        address /* to */,
        uint256 amount
    ) external override onlyPolicyEngine {
        uint256 currentDay = block.timestamp / 1 days;
        DailySpending storage ds = _dailySpending[vault];

        // Reset if new day
        if (ds.dayStart < currentDay) {
            ds.spent = amount;
            ds.dayStart = currentDay;
        } else {
            ds.spent += amount;
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           ADMIN FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Sets the daily spending limit for a specific vault.
    function setVaultDailyLimit(address vault, uint256 limit) external onlyOwner {
        vaultDailyLimits[vault] = limit;
        emit DailyLimitUpdated(vault, limit);
    }

    /// @notice Sets the max transaction amount for a specific vault.
    function setVaultMaxTxAmount(address vault, uint256 maxAmount) external onlyOwner {
        vaultMaxTxAmounts[vault] = maxAmount;
        emit MaxTransactionAmountUpdated(vault, maxAmount);
    }

    /// @notice Updates the default daily limit.
    function setDefaultDailyLimit(uint256 limit) external onlyOwner {
        if (limit == 0) revert InvalidLimit();
        defaultDailyLimit = limit;
        emit DefaultDailyLimitUpdated(limit);
    }

    /// @notice Updates the default max transaction amount.
    function setDefaultMaxTxAmount(uint256 maxAmount) external onlyOwner {
        if (maxAmount == 0) revert InvalidLimit();
        defaultMaxTxAmount = maxAmount;
        emit DefaultMaxTxAmountUpdated(maxAmount);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Returns the current daily spending for a vault.
    function getDailySpent(address vault) external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        DailySpending storage ds = _dailySpending[vault];
        return ds.dayStart == currentDay ? ds.spent : 0;
    }

    /// @notice Returns the remaining daily allowance for a vault.
    function getRemainingDailyAllowance(address vault) external view returns (uint256) {
        uint256 limit = _getDailyLimit(vault);
        uint256 currentDay = block.timestamp / 1 days;
        DailySpending storage ds = _dailySpending[vault];
        uint256 spent = ds.dayStart == currentDay ? ds.spent : 0;
        return spent >= limit ? 0 : limit - spent;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           INTERNAL
    // ══════════════════════════════════════════════════════════════════════════

    function _getDailyLimit(address vault) internal view returns (uint256) {
        uint256 custom = vaultDailyLimits[vault];
        return custom > 0 ? custom : defaultDailyLimit;
    }

    function _getMaxTxAmount(address vault) internal view returns (uint256) {
        uint256 custom = vaultMaxTxAmounts[vault];
        return custom > 0 ? custom : defaultMaxTxAmount;
    }
}
