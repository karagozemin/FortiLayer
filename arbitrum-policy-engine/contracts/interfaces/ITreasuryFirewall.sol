// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITreasuryFirewall
 * @author FortiLayer
 * @notice Interface for the TreasuryFirewall — the execution control layer between Treasury and PolicyEngine.
 * @dev The firewall intercepts all outbound treasury transactions, validates them against
 *      the PolicyEngine, and only allows compliant transactions to execute.
 */
interface ITreasuryFirewall {
    // ══════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    error ZeroAddress();
    error FirewallBypassed();
    error TransactionBlocked(address vault, address token, address to, uint256 amount);
    error VaultNotAuthorized(address vault);

    // ══════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ══════════════════════════════════════════════════════════════════════════

    event TransactionScreened(
        address indexed vault,
        address indexed token,
        address indexed to,
        uint256 amount,
        bool passed
    );
    event VaultAuthorized(address indexed vault);
    event VaultRevoked(address indexed vault);

    // ══════════════════════════════════════════════════════════════════════════
    //                           FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Screens a transaction through the policy engine and executes if compliant.
     * @param vault The vault requesting the transfer.
     * @param token The token to transfer.
     * @param to The recipient address.
     * @param amount The transfer amount.
     * @return True if the transaction passed screening and was executed.
     */
    function screenAndExecute(
        address vault,
        address token,
        address to,
        uint256 amount
    ) external returns (bool);

    /// @notice Authorizes a vault to use this firewall.
    function authorizeVault(address vault) external;

    /// @notice Revokes a vault's firewall authorization.
    function revokeVault(address vault) external;

    /// @notice Returns whether a vault is authorized.
    function isVaultAuthorized(address vault) external view returns (bool);
}
