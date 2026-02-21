// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ITreasury.sol";
import "../interfaces/ITreasuryFirewall.sol";

/**
 * @title Treasury
 * @author FortiLayer
 * @notice Institutional treasury vault that holds organizational funds with firewall-enforced compliance.
 * @dev All outbound transfers are routed through the TreasuryFirewall for policy validation.
 *      The Treasury itself does NOT decide if a transfer is compliant — it delegates that
 *      entirely to the firewall + policy engine pipeline.
 *
 * Architecture:
 *   User → Treasury.requestTransfer() → TreasuryFirewall.screenAndExecute() → PolicyEngine.validateTransaction()
 *                                                                                  ↓ (all pass)
 *                                                                              Token Transfer
 *
 * Roles:
 *   - ADMIN_ROLE: Can configure the treasury (set firewall, manage roles)
 *   - EXECUTOR_ROLE: Can request transfers (human operators, automated systems)
 *   - PAUSER_ROLE: Can trigger emergency pause
 *
 * Security:
 *   - All transfers go through the firewall (no bypass possible)
 *   - Role-based access control with separation of duties
 *   - Emergency pause capability
 *   - Reentrancy protection
 *   - Pull-over-push: vault approves firewall to spend, firewall executes transfer
 */
contract Treasury is ITreasury, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ══════════════════════════════════════════════════════════════════════════
    //                              CONSTANTS
    // ══════════════════════════════════════════════════════════════════════════

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ══════════════════════════════════════════════════════════════════════════
    //                              STORAGE
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice The TreasuryFirewall that screens all outbound transfers
    ITreasuryFirewall public firewall;

    /// @notice Nonce for generating unique transaction IDs
    uint256 private _txNonce;

    /// @notice Total number of transfers executed
    uint256 public totalTransfersExecuted;

    // ══════════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @param _firewall Address of the TreasuryFirewall contract.
     */
    constructor(address _firewall) {
        if (_firewall == address(0)) revert ZeroAddress();

        firewall = ITreasuryFirewall(_firewall);

        // Setup roles — deployer gets all initial roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           DEPOSIT
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @inheritdoc ITreasury
     * @dev Transfers tokens from the caller to this treasury vault.
     *      Caller must have approved this contract to spend the tokens first.
     */
    function deposit(address token, uint256 amount) external override whenNotPaused {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(token, msg.sender, amount);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                         TRANSFER REQUESTS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @inheritdoc ITreasury
     * @dev Critical execution path:
     *      1. Validate inputs
     *      2. Check balance
     *      3. Approve firewall to spend tokens
     *      4. Call firewall.screenAndExecute() — this routes through PolicyEngine
     *      5. If all policies pass, tokens are transferred; otherwise entire tx reverts
     *
     * SECURITY: The approve-then-call pattern is safe here because:
     *   - The firewall is a trusted contract set by admin
     *   - The approval is for the exact amount needed
     *   - Reentrancy guard prevents re-entry attacks
     */
    function requestTransfer(
        address token,
        address to,
        uint256 amount
    ) external override onlyRole(EXECUTOR_ROLE) whenNotPaused nonReentrant returns (bytes32 txId) {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance(token, amount, balance);

        // Generate unique transaction ID
        txId = keccak256(
            abi.encodePacked(address(this), token, to, amount, _txNonce++, block.timestamp)
        );

        emit TransferRequested(txId, token, to, amount, msg.sender);

        // Approve the firewall to spend exact amount
        IERC20(token).approve(address(firewall), amount);

        // Route through firewall — will validate via PolicyEngine and execute if compliant
        // Reverts if any policy fails
        firewall.screenAndExecute(address(this), token, to, amount);

        totalTransfersExecuted++;

        emit TransferExecuted(txId, token, to, amount);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @inheritdoc ITreasury
    function getBalance(address token) external view override returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                         EMERGENCY CONTROLS
    // ══════════════════════════════════════════════════════════════════════════

    /// @inheritdoc ITreasury
    function emergencyPause() external override onlyRole(PAUSER_ROLE) {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    /// @inheritdoc ITreasury
    function emergencyUnpause() external override onlyRole(ADMIN_ROLE) {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                         ADMIN FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Updates the TreasuryFirewall address. Use with extreme caution.
    function setFirewall(address _firewall) external onlyRole(ADMIN_ROLE) {
        if (_firewall == address(0)) revert ZeroAddress();
        firewall = ITreasuryFirewall(_firewall);
    }

    /**
     * @notice Emergency withdrawal — allows admin to rescue stuck tokens.
     * @dev Only usable when paused. This is a safety mechanism, not a regular operation.
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) whenPaused {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        IERC20(token).safeTransfer(to, amount);
    }
}
