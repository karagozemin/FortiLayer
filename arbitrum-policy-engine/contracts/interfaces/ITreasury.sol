// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITreasury
 * @author FortiLayer
 * @notice Interface for the Treasury vault that holds and manages organizational funds.
 * @dev All outbound transfers MUST be routed through the TreasuryFirewall/PolicyEngine
 *      for compliance validation before execution.
 */
interface ITreasury {
    // ══════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance(address token, uint256 requested, uint256 available);
    error TransferFailed(address token, address to, uint256 amount);
    error Unauthorized(address caller);

    // ══════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ══════════════════════════════════════════════════════════════════════════

    event Deposited(address indexed token, address indexed from, uint256 amount);
    event TransferRequested(
        bytes32 indexed txId,
        address indexed token,
        address indexed to,
        uint256 amount,
        address requestedBy
    );
    event TransferExecuted(
        bytes32 indexed txId,
        address indexed token,
        address indexed to,
        uint256 amount
    );
    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);

    // ══════════════════════════════════════════════════════════════════════════
    //                           FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Deposits ERC20 tokens into the treasury.
    function deposit(address token, uint256 amount) external;

    /// @notice Requests a transfer that will be validated by the firewall.
    function requestTransfer(address token, address to, uint256 amount) external returns (bytes32 txId);

    /// @notice Returns the treasury's balance of a specific token.
    function getBalance(address token) external view returns (uint256);

    /// @notice Emergency pause — freezes all treasury operations.
    function emergencyPause() external;

    /// @notice Resumes treasury operations after emergency pause.
    function emergencyUnpause() external;
}
