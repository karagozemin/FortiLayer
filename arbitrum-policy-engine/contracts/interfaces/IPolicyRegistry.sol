// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPolicyRegistry
 * @author FortiLayer
 * @notice Interface for the global policy registry that tracks all approved policy modules.
 * @dev The PolicyRegistry acts as a whitelist of audited/approved policy contracts.
 *      Only registered policies can be attached to vaults via the PolicyEngine.
 */
interface IPolicyRegistry {
    // ══════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    error ZeroAddress();
    error PolicyAlreadyRegistered(address policy);
    error PolicyNotRegistered(address policy);

    // ══════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ══════════════════════════════════════════════════════════════════════════

    event PolicyRegistered(address indexed policy, string name);
    event PolicyUnregistered(address indexed policy);

    // ══════════════════════════════════════════════════════════════════════════
    //                           FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Registers a new approved policy module.
    function registerPolicy(address policy) external;

    /// @notice Removes a policy from the approved registry.
    function unregisterPolicy(address policy) external;

    /// @notice Returns whether a policy is registered and approved.
    function isRegistered(address policy) external view returns (bool);

    /// @notice Returns all registered policy addresses.
    function getAllPolicies() external view returns (address[] memory);

    /// @notice Returns the total number of registered policies.
    function getPolicyCount() external view returns (uint256);
}
