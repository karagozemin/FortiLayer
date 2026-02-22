// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IPolicy.sol";

/**
 * @title BasePolicy
 * @author FortiLayer
 * @notice Abstract base contract for all policy modules.
 * @dev Provides common functionality:
 *      - Policy engine authorization (only the engine can call recordTransaction)
 *      - Owner management for policy configuration
 *      - Default no-op for recordTransaction (override in stateful policies)
 */
abstract contract BasePolicy is IPolicy {
    // ══════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    error OnlyPolicyEngine();
    error OnlyOwner();
    error ZeroAddress();

    // ══════════════════════════════════════════════════════════════════════════
    //                              STORAGE
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice The PolicyEngine authorized to call recordTransaction
    address public policyEngineAddress;

    /// @notice The owner/admin of this policy
    address public owner;

    // ══════════════════════════════════════════════════════════════════════════
    //                           MODIFIERS
    // ══════════════════════════════════════════════════════════════════════════

    modifier onlyPolicyEngine() {
        if (msg.sender != policyEngineAddress) revert OnlyPolicyEngine();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    constructor(address _policyEngine) {
        if (_policyEngine == address(0)) revert ZeroAddress();
        policyEngineAddress = _policyEngine;
        owner = msg.sender;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                          DEFAULT IMPLEMENTATIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @dev Default no-op. Override in stateful policies (e.g., SpendingLimitPolicy).
    function recordTransaction(
        address,
        address,
        address,
        uint256
    ) external virtual override onlyPolicyEngine {
        // No-op by default — stateless policies don't need to record anything
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           ADMIN FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Updates the PolicyEngine address. Only callable by owner.
    function setPolicyEngine(address _policyEngine) external onlyOwner {
        if (_policyEngine == address(0)) revert ZeroAddress();
        policyEngineAddress = _policyEngine;
    }

    /// @notice Transfers ownership of this policy.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
