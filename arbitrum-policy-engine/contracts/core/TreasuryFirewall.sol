// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ITreasuryFirewall.sol";
import "../interfaces/IPolicyEngine.sol";

/**
 * @title TreasuryFirewall
 * @author FortiLayer
 * @notice Execution control layer that screens all outbound treasury transactions.
 * @dev Acts as the enforcement gateway between Treasury vaults and the PolicyEngine.
 *      Every transfer request is intercepted, validated against compliance policies,
 *      and only executed if all rules pass. This is the core security primitive.
 *
 * Architecture:
 *   Treasury → TreasuryFirewall.screenAndExecute() → PolicyEngine.validateTransaction()
 *                                                       ↓ (all pass)
 *                                                   IERC20.safeTransfer()
 *
 * Security:
 *   - Only authorized vaults can use the firewall
 *   - Reentrancy protection on all execution paths
 *   - Pausable for emergency freeze
 *   - Pull-over-push pattern: firewall holds no funds, only routes
 */
contract TreasuryFirewall is ITreasuryFirewall, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ══════════════════════════════════════════════════════════════════════════
    //                              STORAGE
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice The PolicyEngine contract used for transaction validation
    IPolicyEngine public policyEngine;

    /// @dev Authorized vaults that can route transactions through this firewall
    mapping(address => bool) private _authorizedVaults;

    /// @notice Total number of transactions screened
    uint256 public totalScreened;

    /// @notice Total number of transactions that passed screening
    uint256 public totalPassed;

    /// @notice Total number of transactions blocked
    uint256 public totalBlocked;

    // ══════════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @param _policyEngine Address of the deployed PolicyEngine contract.
     */
    constructor(address _policyEngine) Ownable(msg.sender) {
        if (_policyEngine == address(0)) revert ZeroAddress();
        policyEngine = IPolicyEngine(_policyEngine);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           MODIFIERS
    // ══════════════════════════════════════════════════════════════════════════

    modifier onlyAuthorizedVault(address vault) {
        if (!_authorizedVaults[vault]) revert VaultNotAuthorized(vault);
        _;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                         FIREWALL OPERATIONS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @inheritdoc ITreasuryFirewall
     * @dev Critical execution path:
     *      1. Verify vault is authorized
     *      2. Route to PolicyEngine for compliance validation
     *      3. If all policies pass → execute the ERC20 transfer from vault
     *      4. If any policy fails → revert entire transaction
     *
     * NOTE: The vault must have approved this firewall contract to spend tokens
     *       via IERC20.approve() before calling screenAndExecute.
     */
    function screenAndExecute(
        address vault,
        address token,
        address to,
        uint256 amount
    ) external override whenNotPaused nonReentrant onlyAuthorizedVault(vault) returns (bool) {
        if (token == address(0) || to == address(0)) revert ZeroAddress();

        totalScreened++;

        // Validate through PolicyEngine — will revert if non-compliant
        try policyEngine.validateTransaction(vault, token, to, amount) returns (bool passed) {
            if (!passed) {
                totalBlocked++;
                emit TransactionScreened(vault, token, to, amount, false);
                revert TransactionBlocked(vault, token, to, amount);
            }
        } catch (bytes memory reason) {
            totalBlocked++;
            emit TransactionScreened(vault, token, to, amount, false);

            // Re-throw the original error from PolicyEngine
            if (reason.length > 0) {
                assembly {
                    revert(add(reason, 32), mload(reason))
                }
            }
            revert TransactionBlocked(vault, token, to, amount);
        }

        // All policies passed — execute the transfer
        // Transfer tokens from the vault to the recipient
        IERC20(token).safeTransferFrom(vault, to, amount);

        totalPassed++;
        emit TransactionScreened(vault, token, to, amount, true);

        return true;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                         VAULT AUTHORIZATION
    // ══════════════════════════════════════════════════════════════════════════

    /// @inheritdoc ITreasuryFirewall
    function authorizeVault(address vault) external override {
        if (vault == address(0)) revert ZeroAddress();
        _authorizedVaults[vault] = true;
        emit VaultAuthorized(vault);
    }

    /// @inheritdoc ITreasuryFirewall
    function revokeVault(address vault) external override {
        _authorizedVaults[vault] = false;
        emit VaultRevoked(vault);
    }

    /// @inheritdoc ITreasuryFirewall
    function isVaultAuthorized(address vault) external view override returns (bool) {
        return _authorizedVaults[vault];
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           ADMIN FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Updates the PolicyEngine address. Use with extreme caution.
    function setPolicyEngine(address _policyEngine) external {
        if (_policyEngine == address(0)) revert ZeroAddress();
        policyEngine = IPolicyEngine(_policyEngine);
    }

    /// @notice Emergency pause — freezes all firewall operations.
    function pause() external {
        _pause();
    }

    /// @notice Resumes firewall operations.
    function unpause() external {
        _unpause();
    }
}
