// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BasePolicy.sol";

/**
 * @title WhitelistPolicy
 * @author FortiLayer
 * @notice Restricts treasury transfers to a pre-approved set of recipient addresses.
 * @dev Implements an allowlist pattern where only whitelisted destinations can receive
 *      funds from protected vaults. This is a core institutional compliance requirement —
 *      funds should only flow to known, vetted counterparties.
 *
 * Features:
 *   - Per-vault whitelist (different vaults can have different allowlists)
 *   - Global whitelist (addresses approved for all vaults)
 *   - Batch add/remove for gas efficiency
 *   - No state tracking needed (pure validation policy)
 */
contract WhitelistPolicy is BasePolicy {
    // ══════════════════════════════════════════════════════════════════════════
    //                              ERRORS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Thrown when a recipient is not on the whitelist.
    error RecipientNotWhitelisted(address vault, address recipient);

    /// @notice Thrown when trying to add an already whitelisted address.
    error AlreadyWhitelisted(address recipient);

    /// @notice Thrown when trying to remove an address that's not whitelisted.
    error NotWhitelisted(address recipient);

    /// @notice Thrown when an empty array is provided.
    error EmptyArray();

    // ══════════════════════════════════════════════════════════════════════════
    //                              EVENTS
    // ══════════════════════════════════════════════════════════════════════════

    event AddressWhitelisted(address indexed vault, address indexed recipient);
    event AddressRemovedFromWhitelist(address indexed vault, address indexed recipient);
    event GlobalAddressWhitelisted(address indexed recipient);
    event GlobalAddressRemoved(address indexed recipient);

    // ══════════════════════════════════════════════════════════════════════════
    //                              STORAGE
    // ══════════════════════════════════════════════════════════════════════════

    /// @dev vault => recipient => whitelisted
    mapping(address => mapping(address => bool)) private _vaultWhitelist;

    /// @dev Global whitelist (approved for all vaults)
    mapping(address => bool) private _globalWhitelist;

    /// @dev vault => list of whitelisted addresses (for enumeration)
    mapping(address => address[]) private _vaultWhitelistArray;

    // ══════════════════════════════════════════════════════════════════════════
    //                           CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════

    constructor(address _policyEngine) BasePolicy(_policyEngine) {}

    // ══════════════════════════════════════════════════════════════════════════
    //                           POLICY NAME
    // ══════════════════════════════════════════════════════════════════════════

    function policyName() external pure override returns (string memory) {
        return "WhitelistPolicy";
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           VALIDATION
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Validates that the recipient is whitelisted for the vault.
     * @dev Checks both vault-specific and global whitelist.
     */
    function validate(
        address vault,
        address /* token */,
        address to,
        uint256 /* amount */
    ) external view override returns (bool) {
        if (!_vaultWhitelist[vault][to] && !_globalWhitelist[to]) {
            revert RecipientNotWhitelisted(vault, to);
        }
        return true;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                        VAULT WHITELIST MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Adds a single address to a vault's whitelist.
    function addToVaultWhitelist(address vault, address recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        if (_vaultWhitelist[vault][recipient]) revert AlreadyWhitelisted(recipient);

        _vaultWhitelist[vault][recipient] = true;
        _vaultWhitelistArray[vault].push(recipient);

        emit AddressWhitelisted(vault, recipient);
    }

    /// @notice Batch-adds addresses to a vault's whitelist.
    function batchAddToVaultWhitelist(address vault, address[] calldata recipients) external onlyOwner {
        if (recipients.length == 0) revert EmptyArray();

        for (uint256 i = 0; i < recipients.length; ) {
            address recipient = recipients[i];
            if (recipient == address(0)) revert ZeroAddress();
            if (!_vaultWhitelist[vault][recipient]) {
                _vaultWhitelist[vault][recipient] = true;
                _vaultWhitelistArray[vault].push(recipient);
                emit AddressWhitelisted(vault, recipient);
            }
            unchecked { ++i; }
        }
    }

    /// @notice Removes an address from a vault's whitelist.
    function removeFromVaultWhitelist(address vault, address recipient) external onlyOwner {
        if (!_vaultWhitelist[vault][recipient]) revert NotWhitelisted(recipient);
        _vaultWhitelist[vault][recipient] = false;
        emit AddressRemovedFromWhitelist(vault, recipient);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                       GLOBAL WHITELIST MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Adds an address to the global whitelist (approved for all vaults).
    function addToGlobalWhitelist(address recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        _globalWhitelist[recipient] = true;
        emit GlobalAddressWhitelisted(recipient);
    }

    /// @notice Removes an address from the global whitelist.
    function removeFromGlobalWhitelist(address recipient) external onlyOwner {
        _globalWhitelist[recipient] = false;
        emit GlobalAddressRemoved(recipient);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════

    /// @notice Checks if an address is whitelisted for a specific vault.
    function isWhitelisted(address vault, address recipient) external view returns (bool) {
        return _vaultWhitelist[vault][recipient] || _globalWhitelist[recipient];
    }

    /// @notice Checks if an address is on the global whitelist.
    function isGloballyWhitelisted(address recipient) external view returns (bool) {
        return _globalWhitelist[recipient];
    }

    /// @notice Returns the whitelist array for a vault (for enumeration).
    function getVaultWhitelist(address vault) external view returns (address[] memory) {
        return _vaultWhitelistArray[vault];
    }
}
