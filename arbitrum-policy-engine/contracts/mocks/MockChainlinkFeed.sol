// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IChainlinkFeed.sol";

/**
 * @title MockChainlinkFeed
 * @notice Mock Chainlink price feed for testing OracleRiskScorePolicy.
 * @dev Allows setting price and staleness for deterministic tests.
 */
contract MockChainlinkFeed is IChainlinkFeed {
    int256 private _price;
    uint8 private _decimals;
    uint256 private _updatedAt;
    bool private _stale;

    constructor(int256 initialPrice, uint8 feedDecimals) {
        _price = initialPrice;
        _decimals = feedDecimals;
        _updatedAt = block.timestamp;
        _stale = false;
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        uint256 ts = _stale ? 0 : _updatedAt;
        return (1, _price, ts, ts, 1);
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external pure override returns (string memory) {
        return "Mock ETH/USD Feed";
    }

    // ── Test Helpers ──────────────────────────────────────────────────────

    function setPrice(int256 newPrice) external {
        _price = newPrice;
        _updatedAt = block.timestamp;
    }

    function setStale(bool stale) external {
        _stale = stale;
    }
}
