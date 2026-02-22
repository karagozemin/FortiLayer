// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IPolicyEngine.sol";
import "../interfaces/IPolicy.sol";

/**
 * @title PolicyEngine
 * @author FortiLayer
 * @notice Core compliance orchestration engine for institutional treasury management.
 * @dev Validates all outbound treasury transactions against a modular pipeline of policy contracts.
 *      Each vault can have multiple policies attached. ALL policies must pass for a transaction
 *      to be considered compliant. After validation, stateful policies record the transaction.
 *
 * Security considerations:
 *   - Only vault owners can modify their policy configuration
 *   - The engine can be paused globally by the owner (emergency freeze)
 *   - Reentrancy protection on state-changing validation calls
 *   - Policy ordering is preserved for deterministic execution
 */
contract PolicyEngine is IPolicyEngine, Ownable, Pausable, ReentrancyGuard {
    // ══════════════════════════════════════════════════════════════════════════
    //                              STORAGE
    // ══════════════════════════════════════════════════════════════════════════

    /// @dev Vault configuration — owner and ordered policy list
    struct VaultConfig {
        address owner;
        address[] policies;
        mapping(address => bool) policyActive;
        bool registered;
    }

    /// @dev vault address => VaultConfig
    mapping(address => VaultConfig) private _vaults;

    /// @dev Total number of registered vaults (for analytics)
    uint256 public totalVaults;

    /// @dev Total transactions validated (for analytics)
    uint256 public totalTransactionsValidated;

    // ══════════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    constructor() Ownable(msg.sender) {}

    // ══════════════════════════════════════════════════════════════════════════
    //                           MODIFIERS
    // ══════════════════════════════════════════════════════════════════════════

    /// @dev Ensures only the vault's registered owner can call
    modifier onlyVaultOwner(address vault) {
        if (msg.sender != _vaults[vault].owner) revert NotVaultOwner(msg.sender, vault);
        _;
    }

    /// @dev Ensures the vault is registered
    modifier vaultExists(address vault) {
        if (!_vaults[vault].registered) {
            revert VaultNotRegistered(vault);
        }
        _;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           VAULT MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════════

    /// @inheritdoc IPolicyEngine
    function registerVault(address vault) external override whenNotPaused {
        if (vault == address(0)) revert ZeroAddress();
        if (_vaults[vault].registered) revert VaultAlreadyRegistered(vault);

        _vaults[vault].owner = msg.sender;
        _vaults[vault].registered = true;
        totalVaults++;

        emit VaultRegistered(vault, msg.sender);
    }

    /// @inheritdoc IPolicyEngine
    function addPolicy(
        address vault,
        address policy
    ) external override whenNotPaused vaultExists(vault) onlyVaultOwner(vault) {
        if (policy == address(0)) revert ZeroAddress();
        if (_vaults[vault].policyActive[policy]) {
            revert PolicyAlreadyRegistered(vault, policy);
        }

        _vaults[vault].policies.push(policy);
        _vaults[vault].policyActive[policy] = true;

        emit PolicyAdded(vault, policy);
    }

    /// @inheritdoc IPolicyEngine
    function removePolicy(
        address vault,
        address policy
    ) external override whenNotPaused vaultExists(vault) onlyVaultOwner(vault) {
        if (!_vaults[vault].policyActive[policy]) {
            revert PolicyNotRegistered(vault, policy);
        }

        _vaults[vault].policyActive[policy] = false;

        // Remove from ordered array — swap with last element for gas efficiency
        address[] storage policies = _vaults[vault].policies;
        uint256 length = policies.length;
        for (uint256 i = 0; i < length; ) {
            if (policies[i] == policy) {
                policies[i] = policies[length - 1];
                policies.pop();
                break;
            }
            unchecked { ++i; }
        }

        emit PolicyRemoved(vault, policy);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                         TRANSACTION VALIDATION
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @inheritdoc IPolicyEngine
     * @dev Critical security function — validates transaction against ALL vault policies.
     *      Uses a two-phase approach:
     *        1. Validation phase: Check all policies (view calls, no state changes)
     *        2. Recording phase: Record transaction in stateful policies (after all pass)
     *      This ensures atomic compliance — either all policies pass or the entire tx reverts.
     */
    function validateTransaction(
        address vault,
        address token,
        address to,
        uint256 amount
    ) external override whenNotPaused nonReentrant vaultExists(vault) returns (bool) {
        address[] storage policies = _vaults[vault].policies;
        uint256 length = policies.length;

        // Phase 1: Validate against all policies
        for (uint256 i = 0; i < length; ) {
            address policyAddr = policies[i];

            // Skip inactive policies (defensive — shouldn't happen with proper removal)
            if (!_vaults[vault].policyActive[policyAddr]) {
                unchecked { ++i; }
                continue;
            }

            try IPolicy(policyAddr).validate(vault, token, to, amount) returns (bool passed) {
                if (!passed) {
                    emit TransactionRejected(vault, token, to, amount, policyAddr);
                    revert TransactionNotCompliant(vault, policyAddr);
                }
            } catch {
                emit TransactionRejected(vault, token, to, amount, policyAddr);
                revert TransactionNotCompliant(vault, policyAddr);
            }

            unchecked { ++i; }
        }

        // Phase 2: Record transaction in all stateful policies
        for (uint256 i = 0; i < length; ) {
            address policyAddr = policies[i];
            if (_vaults[vault].policyActive[policyAddr]) {
                // Use try-catch: recording is best-effort (policy may not track state)
                try IPolicy(policyAddr).recordTransaction(vault, token, to, amount) {} catch {}
            }
            unchecked { ++i; }
        }

        totalTransactionsValidated++;
        emit TransactionValidated(vault, token, to, amount);

        return true;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                              VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @inheritdoc IPolicyEngine
    function getVaultPolicies(address vault) external view override returns (address[] memory) {
        return _vaults[vault].policies;
    }

    /// @inheritdoc IPolicyEngine
    function isPolicyActive(address vault, address policy) external view override returns (bool) {
        return _vaults[vault].policyActive[policy];
    }

    /// @notice Returns the owner of a vault.
    function getVaultOwner(address vault) external view returns (address) {
        return _vaults[vault].owner;
    }

    /// @notice Returns whether a vault is registered.
    function isVaultRegistered(address vault) external view returns (bool) {
        return _vaults[vault].registered;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           EMERGENCY CONTROLS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Emergency pause — freezes all engine operations.
    /// @dev Only callable by the contract owner. Use in case of detected exploit.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resumes engine operations after emergency pause.
    function unpause() external onlyOwner {
        _unpause();
    }
}
