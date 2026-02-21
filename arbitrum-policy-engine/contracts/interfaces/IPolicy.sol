// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPolicy
 * @author FortiLayer
 * @notice Interface for all policy modules in the FortiLayer execution firewall.
 * @dev Each policy module must implement this interface to be registered in the PolicyEngine.
 *      Policies are modular validators that enforce specific compliance rules on treasury transactions.
 */
interface IPolicy {
    /// @notice Returns the human-readable name of this policy module.
    /// @return The policy name as a string.
    function policyName() external view returns (string memory);

    /**
     * @notice Validates a transaction against this policy's rules.
     * @dev Must revert with a descriptive custom error if validation fails.
     *      Must NOT modify state for view-only checks. State changes (e.g., spending tracking)
     *      should happen in a separate `recordTransaction` call after execution.
     * @param vault The address of the treasury vault initiating the transaction.
     * @param token The ERC20 token address being transferred (address(0) for native ETH).
     * @param to The recipient address of the transaction.
     * @param amount The amount of tokens being transferred.
     * @return True if the transaction passes this policy's validation.
     */
    function validate(
        address vault,
        address token,
        address to,
        uint256 amount
    ) external view returns (bool);

    /**
     * @notice Records a transaction after successful execution for stateful tracking.
     * @dev Called by the PolicyEngine after all validations pass and the transaction executes.
     *      Used by policies that need to track cumulative state (e.g., daily spending limits).
     * @param vault The address of the treasury vault.
     * @param token The ERC20 token address.
     * @param to The recipient address.
     * @param amount The amount transferred.
     */
    function recordTransaction(
        address vault,
        address token,
        address to,
        uint256 amount
    ) external;
}
