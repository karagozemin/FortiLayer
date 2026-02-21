// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IPolicyRegistry.sol";
import "../interfaces/IPolicy.sol";

/**
 * @title PolicyRegistry
 * @author FortiLayer
 * @notice Global registry of approved policy modules for the FortiLayer ecosystem.
 * @dev Acts as a whitelist of audited/approved policy contracts. The PolicyEngine can
 *      optionally check this registry before allowing a policy to be attached to a vault.
 *      This provides an additional security layer — only vetted policies can be used.
 *
 * Governance:
 *   - Owner (DAO or admin) registers approved policies
 *   - Each policy must implement IPolicy interface
 *   - Policies can be unregistered if found to be compromised
 */
contract PolicyRegistry is IPolicyRegistry, Ownable {
    // ══════════════════════════════════════════════════════════════════════════
    //                              STORAGE
    // ══════════════════════════════════════════════════════════════════════════

    /// @dev Policy address => registered status
    mapping(address => bool) private _registered;

    /// @dev Ordered list of all registered policy addresses
    address[] private _policies;

    /// @dev Policy address => index in _policies array (for efficient removal)
    mapping(address => uint256) private _policyIndex;

    // ══════════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    constructor() Ownable(msg.sender) {}

    // ══════════════════════════════════════════════════════════════════════════
    //                         REGISTRY MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @inheritdoc IPolicyRegistry
     * @dev Registers a new policy. Calls policyName() to verify it implements IPolicy.
     */
    function registerPolicy(address policy) external override onlyOwner {
        if (policy == address(0)) revert ZeroAddress();
        if (_registered[policy]) revert PolicyAlreadyRegistered(policy);

        // Verify the contract implements IPolicy by calling policyName()
        string memory name = IPolicy(policy).policyName();

        _registered[policy] = true;
        _policyIndex[policy] = _policies.length;
        _policies.push(policy);

        emit PolicyRegistered(policy, name);
    }

    /// @inheritdoc IPolicyRegistry
    function unregisterPolicy(address policy) external override onlyOwner {
        if (!_registered[policy]) revert PolicyNotRegistered(policy);

        _registered[policy] = false;

        // Swap with last element for gas-efficient removal
        uint256 index = _policyIndex[policy];
        uint256 lastIndex = _policies.length - 1;

        if (index != lastIndex) {
            address lastPolicy = _policies[lastIndex];
            _policies[index] = lastPolicy;
            _policyIndex[lastPolicy] = index;
        }

        _policies.pop();
        delete _policyIndex[policy];

        emit PolicyUnregistered(policy);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @inheritdoc IPolicyRegistry
    function isRegistered(address policy) external view override returns (bool) {
        return _registered[policy];
    }

    /// @inheritdoc IPolicyRegistry
    function getAllPolicies() external view override returns (address[] memory) {
        return _policies;
    }

    /// @inheritdoc IPolicyRegistry
    function getPolicyCount() external view override returns (uint256) {
        return _policies.length;
    }
}
