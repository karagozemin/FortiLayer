// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IChainlinkFeed
 * @author FortiLayer
 * @notice Minimal Chainlink AggregatorV3Interface for oracle integration.
 * @dev Live on Arbitrum Sepolia: 0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165 (ETH/USD)
 */
interface IChainlinkFeed {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function decimals() external view returns (uint8);

    function description() external view returns (string memory);
}
