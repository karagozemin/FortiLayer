// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BasePolicy.sol";

/**
 * @title TimelockPolicy
 * @author FortiLayer
 * @notice Enforces a minimum time delay between consecutive transactions from a vault.
 * @dev Prevents rapid-fire exploitation by requiring a cooldown period between outbound
 *      transfers. This is critical for institutional treasuries where large transfers
 *      should have a mandatory waiting period for human review.
 *
 * Features:
 *   - Per-vault configurable timelock duration
 *   - Global default timelock for new vaults
 *   - Automatic cooldown tracking after each transaction
 *   - Emergency override capability for owner
 *
 * Use Cases:
 *   - Prevent key compromise from draining funds instantly
 *   - Give compliance officers time to review large transfers
 *   - Rate-limit outbound treasury operations
 */
contract TimelockPolicy is BasePolicy {
    // ══════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Thrown when a transaction is attempted before the cooldown expires.
    error TimelockActive(address vault, uint256 unlockTime, uint256 currentTime);

    /// @notice Thrown when setting an invalid duration.
    error InvalidDuration();

    // ══════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ══════════════════════════════════════════════════════════════════════════

    event TimelockDurationUpdated(address indexed vault, uint256 newDuration);
    event DefaultTimelockUpdated(uint256 newDuration);
    event TimelockReset(address indexed vault);

    // ══════════════════════════════════════════════════════════════════════════
    //                              STORAGE
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Default timelock duration in seconds
    uint256 public defaultTimelockDuration;

    /// @dev vault => custom timelock duration (0 = use default)
    mapping(address => uint256) public vaultTimelockDuration;

    /// @dev vault => timestamp of last executed transaction
    mapping(address => uint256) public lastTransactionTime;

    // ══════════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @param _policyEngine The PolicyEngine contract address.
     * @param _defaultDuration Default timelock duration in seconds (e.g., 3600 = 1 hour).
     */
    constructor(
        address _policyEngine,
        uint256 _defaultDuration
    ) BasePolicy(_policyEngine) {
        if (_defaultDuration == 0) revert InvalidDuration();
        defaultTimelockDuration = _defaultDuration;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           POLICY NAME
    // ══════════════════════════════════════════════════════════════════════════

    function policyName() external pure override returns (string memory) {
        return "TimelockPolicy";
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           VALIDATION
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Validates that enough time has passed since the vault's last transaction.
     * @dev Compares current block.timestamp against lastTransactionTime + duration.
     *      First transaction always passes (lastTransactionTime == 0).
     */
    function validate(
        address vault,
        address /* token */,
        address /* to */,
        uint256 /* amount */
    ) external view override returns (bool) {
        uint256 lastTx = lastTransactionTime[vault];

        // First transaction always passes
        if (lastTx == 0) return true;

        uint256 duration = _getTimelockDuration(vault);
        uint256 unlockTime = lastTx + duration;

        if (block.timestamp < unlockTime) {
            revert TimelockActive(vault, unlockTime, block.timestamp);
        }

        return true;
    }

    /**
     * @notice Records the transaction timestamp for cooldown tracking.
     */
    function recordTransaction(
        address vault,
        address /* token */,
        address /* to */,
        uint256 /* amount */
    ) external override onlyPolicyEngine {
        lastTransactionTime[vault] = block.timestamp;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           ADMIN FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Sets a custom timelock duration for a specific vault.
    function setVaultTimelockDuration(address vault, uint256 duration) external onlyOwner {
        vaultTimelockDuration[vault] = duration;
        emit TimelockDurationUpdated(vault, duration);
    }

    /// @notice Updates the default timelock duration.
    function setDefaultTimelockDuration(uint256 duration) external onlyOwner {
        if (duration == 0) revert InvalidDuration();
        defaultTimelockDuration = duration;
        emit DefaultTimelockUpdated(duration);
    }

    /// @notice Emergency reset — clears the timelock for a vault (allows immediate transaction).
    function resetTimelock(address vault) external onlyOwner {
        lastTransactionTime[vault] = 0;
        emit TimelockReset(vault);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Returns the effective timelock duration for a vault.
    function getEffectiveTimelockDuration(address vault) external view returns (uint256) {
        return _getTimelockDuration(vault);
    }

    /// @notice Returns the unlock time for a vault (when next transaction is allowed).
    function getUnlockTime(address vault) external view returns (uint256) {
        uint256 lastTx = lastTransactionTime[vault];
        if (lastTx == 0) return 0; // No previous transaction
        return lastTx + _getTimelockDuration(vault);
    }

    /// @notice Returns whether a vault's timelock has expired (ready for next tx).
    function isTimelockExpired(address vault) external view returns (bool) {
        uint256 lastTx = lastTransactionTime[vault];
        if (lastTx == 0) return true;
        return block.timestamp >= lastTx + _getTimelockDuration(vault);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           INTERNAL
    // ══════════════════════════════════════════════════════════════════════════

    function _getTimelockDuration(address vault) internal view returns (uint256) {
        uint256 custom = vaultTimelockDuration[vault];
        return custom > 0 ? custom : defaultTimelockDuration;
    }
}
