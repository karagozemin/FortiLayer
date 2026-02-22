// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BasePolicy.sol";

/**
 * @title MultiSigPolicy
 * @author FortiLayer
 * @notice Requires multiple approvals from designated signers before a transaction can execute.
 * @dev Implements an M-of-N approval scheme where M signers must approve a transaction
 *      before it passes validation. Transactions are identified by a hash of their parameters.
 *
 * Flow:
 *   1. Transaction is proposed (automatically when first signer approves)
 *   2. Required number of signers approve the transaction
 *   3. PolicyEngine validates — if approvals >= threshold, transaction passes
 *   4. After execution, the approval state is cleared
 *
 * Security:
 *   - Signers cannot approve the same transaction twice
 *   - Only designated signers can approve
 *   - Approval count must meet threshold at validation time
 *   - Transaction hash includes vault, token, recipient, amount for uniqueness
 */
contract MultiSigPolicy is BasePolicy {
    // ══════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    error NotASigner(address caller);
    error NotApproved(bytes32 txHash, address signer);
    error AlreadyApproved(address signer, bytes32 txHash);
    error InsufficientApprovals(bytes32 txHash, uint256 current, uint256 required);
    error InvalidThreshold(uint256 threshold, uint256 signerCount);
    error SignerAlreadyAdded(address signer);
    error SignerNotFound(address signer);
    error EmptySigners();

    // ══════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ══════════════════════════════════════════════════════════════════════════

    event TransactionApproved(bytes32 indexed txHash, address indexed signer, uint256 approvalCount);
    event TransactionApprovalRevoked(bytes32 indexed txHash, address indexed signer, uint256 approvalCount);
    event ThresholdUpdated(uint256 newThreshold);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event ApprovalsCleared(bytes32 indexed txHash);

    // ══════════════════════════════════════════════════════════════════════════
    //                              STORAGE
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice The number of approvals required for a transaction to pass
    uint256 public requiredApprovals;

    /// @dev Ordered list of designated signers
    address[] public signers;

    /// @dev Quick lookup for signer status
    mapping(address => bool) public isSigner;

    /// @dev txHash => signer => approved
    mapping(bytes32 => mapping(address => bool)) public approvals;

    /// @dev txHash => approval count
    mapping(bytes32 => uint256) public approvalCount;

    // ══════════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @param _policyEngine The PolicyEngine contract address.
     * @param _signers Initial set of designated signers.
     * @param _requiredApprovals Number of approvals needed (M-of-N).
     */
    constructor(
        address _policyEngine,
        address[] memory _signers,
        uint256 _requiredApprovals
    ) BasePolicy(_policyEngine) {
        if (_signers.length == 0) revert EmptySigners();
        if (_requiredApprovals == 0 || _requiredApprovals > _signers.length) {
            revert InvalidThreshold(_requiredApprovals, _signers.length);
        }

        for (uint256 i = 0; i < _signers.length; ) {
            if (_signers[i] == address(0)) revert ZeroAddress();
            signers.push(_signers[i]);
            isSigner[_signers[i]] = true;
            unchecked { ++i; }
        }
        requiredApprovals = _requiredApprovals;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           POLICY NAME
    // ══════════════════════════════════════════════════════════════════════════

    function policyName() external pure override returns (string memory) {
        return "MultiSigPolicy";
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           VALIDATION
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Validates that a transaction has received enough approvals.
     * @dev Computes the transaction hash and checks approval count against threshold.
     */
    function validate(
        address vault,
        address token,
        address to,
        uint256 amount
    ) external view override returns (bool) {
        bytes32 txHash = getTransactionHash(vault, token, to, amount);
        uint256 count = approvalCount[txHash];

        if (count < requiredApprovals) {
            revert InsufficientApprovals(txHash, count, requiredApprovals);
        }

        return true;
    }

    /**
     * @notice Clears approvals after a transaction is executed.
     * @dev Called by the PolicyEngine to prevent approval reuse.
     */
    function recordTransaction(
        address vault,
        address token,
        address to,
        uint256 amount
    ) external override onlyPolicyEngine {
        bytes32 txHash = getTransactionHash(vault, token, to, amount);
        _clearApprovals(txHash);
        emit ApprovalsCleared(txHash);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                         SIGNER OPERATIONS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Approves a transaction. Must be called by a designated signer.
     * @param vault The vault address.
     * @param token The token address.
     * @param to The recipient address.
     * @param amount The transfer amount.
     */
    function approveTransaction(
        address vault,
        address token,
        address to,
        uint256 amount
    ) external {
        if (!isSigner[msg.sender]) revert NotASigner(msg.sender);

        bytes32 txHash = getTransactionHash(vault, token, to, amount);

        if (approvals[txHash][msg.sender]) {
            revert AlreadyApproved(msg.sender, txHash);
        }

        approvals[txHash][msg.sender] = true;
        approvalCount[txHash]++;

        emit TransactionApproved(txHash, msg.sender, approvalCount[txHash]);
    }

    /**
     * @notice Revokes a previous approval.
     * @param vault The vault address.
     * @param token The token address.
     * @param to The recipient address.
     * @param amount The transfer amount.
     */
    function revokeApproval(
        address vault,
        address token,
        address to,
        uint256 amount
    ) external {
        if (!isSigner[msg.sender]) revert NotASigner(msg.sender);

        bytes32 txHash = getTransactionHash(vault, token, to, amount);

        if (!approvals[txHash][msg.sender]) {
            revert NotApproved(txHash, msg.sender);
        }

        approvals[txHash][msg.sender] = false;
        approvalCount[txHash]--;

        emit TransactionApprovalRevoked(txHash, msg.sender, approvalCount[txHash]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           ADMIN FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Adds a new signer.
    function addSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        if (isSigner[signer]) revert SignerAlreadyAdded(signer);

        signers.push(signer);
        isSigner[signer] = true;

        emit SignerAdded(signer);
    }

    /// @notice Removes a signer. Ensures threshold remains valid.
    function removeSigner(address signer) external onlyOwner {
        if (!isSigner[signer]) revert SignerNotFound(signer);
        if (signers.length - 1 < requiredApprovals) {
            revert InvalidThreshold(requiredApprovals, signers.length - 1);
        }

        isSigner[signer] = false;

        // Remove from array
        uint256 length = signers.length;
        for (uint256 i = 0; i < length; ) {
            if (signers[i] == signer) {
                signers[i] = signers[length - 1];
                signers.pop();
                break;
            }
            unchecked { ++i; }
        }

        emit SignerRemoved(signer);
    }

    /// @notice Updates the required approval threshold.
    function setRequiredApprovals(uint256 _requiredApprovals) external onlyOwner {
        if (_requiredApprovals == 0 || _requiredApprovals > signers.length) {
            revert InvalidThreshold(_requiredApprovals, signers.length);
        }
        requiredApprovals = _requiredApprovals;
        emit ThresholdUpdated(_requiredApprovals);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Computes the hash of a transaction for approval tracking.
    function getTransactionHash(
        address vault,
        address token,
        address to,
        uint256 amount
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(vault, token, to, amount));
    }

    /// @notice Returns all signers.
    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    /// @notice Returns the number of signers.
    function getSignerCount() external view returns (uint256) {
        return signers.length;
    }

    /// @notice Checks if a transaction has enough approvals.
    function hasEnoughApprovals(bytes32 txHash) external view returns (bool) {
        return approvalCount[txHash] >= requiredApprovals;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           INTERNAL
    // ══════════════════════════════════════════════════════════════════════════

    /// @dev Clears all approvals for a transaction hash.
    function _clearApprovals(bytes32 txHash) internal {
        uint256 length = signers.length;
        for (uint256 i = 0; i < length; ) {
            approvals[txHash][signers[i]] = false;
            unchecked { ++i; }
        }
        approvalCount[txHash] = 0;
    }
}
