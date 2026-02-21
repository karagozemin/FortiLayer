// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TransactionExecutor
 * @author FortiLayer
 * @notice Handles the final execution of validated treasury transactions.
 * @dev This contract is the last step in the execution pipeline. It should only be called
 *      after the PolicyEngine has validated the transaction. Uses role-based access control
 *      to ensure only authorized callers (TreasuryFirewall) can trigger execution.
 *
 * Roles:
 *   - DEFAULT_ADMIN_ROLE: Can manage roles and update configuration
 *   - EXECUTOR_ROLE: Can execute validated transactions (granted to TreasuryFirewall)
 */
contract TransactionExecutor is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ══════════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Role required to execute transactions
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    // ══════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    error ZeroAddress();
    error ZeroAmount();
    error ExecutionFailed(address token, address to, uint256 amount);

    // ══════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ══════════════════════════════════════════════════════════════════════════

    event TransactionExecuted(
        bytes32 indexed txId,
        address indexed token,
        address indexed to,
        uint256 amount,
        address executor
    );

    // ══════════════════════════════════════════════════════════════════════════
    //                              STORAGE
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Nonce for generating unique transaction IDs
    uint256 private _nonce;

    /// @notice Total number of executed transactions
    uint256 public totalExecuted;

    // ══════════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                         EXECUTION
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Executes a validated token transfer.
     * @dev Only callable by addresses with EXECUTOR_ROLE (typically the TreasuryFirewall).
     *      The source vault must have approved this contract to spend the tokens.
     * @param from The source address (vault) to transfer tokens from.
     * @param token The ERC20 token to transfer.
     * @param to The recipient address.
     * @param amount The amount to transfer.
     * @return txId The unique transaction identifier.
     */
    function execute(
        address from,
        address token,
        address to,
        uint256 amount
    ) external onlyRole(EXECUTOR_ROLE) nonReentrant returns (bytes32 txId) {
        if (token == address(0) || to == address(0) || from == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        txId = keccak256(abi.encodePacked(from, token, to, amount, _nonce++, block.timestamp));

        IERC20(token).safeTransferFrom(from, to, amount);

        totalExecuted++;
        emit TransactionExecuted(txId, token, to, amount, msg.sender);
    }
}
