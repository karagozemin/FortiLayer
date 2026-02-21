// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPolicyEngine
 * @author FortiLayer
 * @notice Interface for the core PolicyEngine — the central compliance orchestration layer.
 * @dev The PolicyEngine validates all treasury transactions against registered policy modules.
 *      It is the single enforcement point that every treasury operation must pass through.
 */
interface IPolicyEngine {
    // ══════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Thrown when a zero address is provided where a valid address is required.
    error ZeroAddress();

    /// @notice Thrown when a policy is already registered for a vault.
    error PolicyAlreadyRegistered(address vault, address policy);

    /// @notice Thrown when trying to interact with a policy that is not registered.
    error PolicyNotRegistered(address vault, address policy);

    /// @notice Thrown when a transaction fails policy validation.
    error TransactionNotCompliant(address vault, address failedPolicy);

    /// @notice Thrown when the caller is not authorized for the vault.
    error NotVaultOwner(address caller, address vault);

    /// @notice Thrown when the engine is paused.
    error EnginePaused();

    /// @notice Thrown when a vault is already registered.
    error VaultAlreadyRegistered(address vault);

    /// @notice Thrown when interacting with an unregistered vault.
    error VaultNotRegistered(address vault);

    // ══════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when a new vault is registered.
    event VaultRegistered(address indexed vault, address indexed owner);

    /// @notice Emitted when a policy is added to a vault.
    event PolicyAdded(address indexed vault, address indexed policy);

    /// @notice Emitted when a policy is removed from a vault.
    event PolicyRemoved(address indexed vault, address indexed policy);

    /// @notice Emitted when a transaction passes all policy validations.
    event TransactionValidated(
        address indexed vault,
        address indexed token,
        address indexed to,
        uint256 amount
    );

    /// @notice Emitted when a transaction is rejected by a policy.
    event TransactionRejected(
        address indexed vault,
        address indexed token,
        address to,
        uint256 amount,
        address failedPolicy
    );

    // ══════════════════════════════════════════════════════════════════════════
    //                           VAULT MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Registers a new vault with the PolicyEngine.
    function registerVault(address vault) external;

    /// @notice Adds a policy module to a vault's validation pipeline.
    function addPolicy(address vault, address policy) external;

    /// @notice Removes a policy module from a vault's validation pipeline.
    function removePolicy(address vault, address policy) external;

    // ══════════════════════════════════════════════════════════════════════════
    //                         TRANSACTION VALIDATION
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Validates a transaction against ALL registered policies for a vault.
     * @dev Reverts if any policy fails. Records the transaction in stateful policies upon success.
     * @param vault The vault initiating the transaction.
     * @param token The ERC20 token address (address(0) for ETH).
     * @param to The recipient address.
     * @param amount The transfer amount.
     * @return True if all policies pass.
     */
    function validateTransaction(
        address vault,
        address token,
        address to,
        uint256 amount
    ) external returns (bool);

    // ══════════════════════════════════════════════════════════════════════════
    //                              VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Returns all active policy addresses for a vault.
    function getVaultPolicies(address vault) external view returns (address[] memory);

    /// @notice Checks if a specific policy is active for a vault.
    function isPolicyActive(address vault, address policy) external view returns (bool);
}
