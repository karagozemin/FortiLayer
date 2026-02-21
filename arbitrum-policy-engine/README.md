<div align="center">

# 🛡 FortiLayer

### Programmable Treasury Execution Firewall on Arbitrum

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19+-yellow?logo=hardhat)](https://hardhat.org/)
[![Arbitrum](https://img.shields.io/badge/Arbitrum-Sepolia-blue?logo=arbitrum)](https://arbitrum.io/)
[![Tests](https://img.shields.io/badge/Tests-119%20passing-brightgreen)](.)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**FortiLayer** is an institutional-grade, modular smart contract framework that acts as a programmable firewall for on-chain treasury operations. Every outbound transfer is screened against configurable policy modules before execution — enforcing spending limits, whitelists, timelocks, multi-sig governance, and risk scoring in real-time.

[Architecture](#architecture) · [Quick Start](#quick-start) · [Policies](#policy-modules) · [Demo](#demo) · [Frontend](#frontend)

</div>

---

## 🎯 Problem

DAOs and institutional treasuries hold billions on-chain, yet most lack **granular, composable execution controls**. A single compromised key or rogue governance vote can drain a treasury. Existing solutions are either:

- **Too rigid** — hardcoded limits that can't adapt
- **Too permissive** — approve-once, execute-anything patterns
- **Not composable** — can't stack multiple compliance rules

## 💡 Solution

FortiLayer introduces a **firewall layer** between treasury vaults and the blockchain. Every transaction must pass through a configurable policy engine before execution:

```
Treasury → TreasuryFirewall → PolicyEngine → [Policy₁, Policy₂, ...Policyₙ] → Execute ✅ or Revert ❌
```

Policies are **modular** — plug in only what you need. **Stateful** — they track cumulative spending, cooldowns, and approval counts. **Per-vault configurable** — different vaults can have different rules.

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          FortiLayer Architecture                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────┐    ┌──────────────────┐    ┌───────────────┐            │
│  │Treasury │───▶│TreasuryFirewall  │───▶│ PolicyEngine   │            │
│  │  Vault  │    │ screenAndExecute │    │ validateTx()   │            │
│  └─────────┘    └──────────────────┘    └───────┬───────┘            │
│                                                  │                    │
│                          ┌───────────────────────┼────────────┐      │
│                          ▼           ▼           ▼            ▼      │
│                   ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐  │
│                   │Spending  │ │Whitelist │ │Timelock │ │MultiSig│  │
│                   │Limit     │ │Policy    │ │Policy   │ │Policy  │  │
│                   └──────────┘ └──────────┘ └─────────┘ └────────┘  │
│                                                          ┌────────┐  │
│                   ┌──────────────────┐                   │Risk    │  │
│                   │ PolicyRegistry   │                   │Score   │  │
│                   │ (approved list)  │                   │Policy  │  │
│                   └──────────────────┘                   └────────┘  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Core Contracts

| Contract | Purpose |
|---|---|
| **PolicyEngine** | Central orchestrator — validates transactions against all registered policies for a vault |
| **TreasuryFirewall** | Execution gateway — screens via PolicyEngine, then executes ERC-20 transfer |
| **TransactionExecutor** | Role-based executor with unique transaction ID generation |
| **Treasury** | Institutional vault with deposit, transfer, emergency pause, and role-based access |
| **PolicyRegistry** | Global whitelist of approved policy implementations |

## 📋 Policy Modules

FortiLayer ships with **5 composable policy modules**, all implementing the `IPolicy` interface:

### 1. 💳 Spending Limit Policy
Enforces **daily cumulative limits** and **per-transaction maximums**. Automatically resets at day boundaries. Per-vault configurable with global defaults.

### 2. ✅ Whitelist Policy
Only **pre-approved recipient addresses** can receive funds. Supports per-vault whitelists, global whitelists, and batch operations.

### 3. ⏱ Timelock Policy
Enforces **cooldown periods** between consecutive transactions. Prevents rapid-fire drain attacks. Emergency reset by owner.

### 4. ✍️ Multi-Signature Policy
Requires **M-of-N signer approvals** before a transaction can execute. Approvals auto-clear after execution. Full on-chain governance.

### 5. 📈 Risk Score Policy
Assigns **0-100 risk scores** to addresses (higher = safer). Blocks transactions to addresses below a configurable threshold. Batch scoring support.

### Writing Custom Policies

Extend `BasePolicy` and implement `validate()`:

```solidity
contract MyPolicy is BasePolicy {
    constructor(address engine) BasePolicy(engine, "MyPolicy") {}

    function validate(
        address vault,
        address token,
        address to,
        uint256 amount
    ) external view override returns (bool) {
        // Your custom logic here
        return true;
    }
}
```

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 18
- npm or yarn

### Install & Build

```bash
cd arbitrum-policy-engine
npm install
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

**119 tests passing** across 9 test files covering:
- Unit tests for every policy module
- PolicyEngine orchestration tests
- TreasuryFirewall screening tests
- Treasury vault tests
- Full integration pipeline tests

### Run Demo Script

```bash
npx hardhat run scripts/demo.ts
```

The demo deploys all contracts, configures a vault with 3 policies, then demonstrates:
1. ✅ Valid transfer (within limits, whitelisted, good risk score)
2. ❌ Over-limit transfer (blocked by SpendingLimitPolicy)
3. ❌ Non-whitelisted recipient (blocked by WhitelistPolicy)
4. ❌ Risky address (blocked by RiskScorePolicy)
5. 🚨 Emergency pause

### Deploy to Arbitrum Sepolia

```bash
# Copy .env.example to .env and fill in your keys
cp .env.example .env

# Deploy
npx hardhat run scripts/deploy.ts --network arbitrumSepolia

# Verify contracts
npx hardhat verify --network arbitrumSepolia <CONTRACT_ADDRESS>
```

## 🖥 Frontend

A React + Vite dashboard for interacting with deployed contracts.

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — features include:

- **Dashboard** — Real-time treasury stats, transaction history, pass-rate visualization
- **Policy Manager** — View and configure all 5 policy modules with live parameters
- **Transaction Queue** — Timeline view of all screened transactions with status badges
- **Firewall Status** — System health metrics, architecture diagram, emergency controls

### Frontend Environment

Create `frontend/.env` with your deployed contract addresses:

```env
VITE_POLICY_ENGINE=0x...
VITE_TREASURY_FIREWALL=0x...
VITE_TREASURY=0x...
VITE_MOCK_USDC=0x...
# ... etc
```

## 🔒 Security Features

- **ReentrancyGuard** on all state-changing operations
- **Pausable** emergency circuit breaker
- **Ownable / AccessControl** for admin functions
- **Custom errors** for gas-efficient reverts
- **NatSpec documentation** on all contracts
- **Two-phase validation** — validate (view) then record (stateful)
- **SafeERC20** for all token operations

## 🏛 Why Arbitrum?

- **Low gas costs** make multi-policy validation economically viable
- **EVM equivalence** means standard Solidity tooling works out of the box
- **Fast finality** enables real-time transaction screening
- **Growing institutional adoption** — Arbitrum is the largest L2 by TVL

## 📁 Project Structure

```
arbitrum-policy-engine/
├── contracts/
│   ├── core/              # PolicyEngine, TreasuryFirewall, TransactionExecutor
│   ├── interfaces/        # IPolicy, IPolicyEngine, ITreasury, etc.
│   ├── policies/          # 5 composable policy modules + BasePolicy
│   ├── registry/          # PolicyRegistry
│   ├── treasury/          # Treasury vault
│   └── mocks/             # MockUSDC for testing
├── scripts/
│   ├── deploy.ts          # Full deployment + configuration
│   └── demo.ts            # Interactive demo showing pass/block scenarios
├── test/                  # 9 test files, 119 tests
├── frontend/              # React + Vite dashboard
│   └── src/
│       ├── components/    # Dashboard, PolicyManager, TransactionQueue, FirewallStatus
│       ├── hooks/         # useWallet, useContracts
│       ├── types/         # TypeScript interfaces
│       └── utils/         # Contract ABIs, helpers
├── hardhat.config.ts
└── package.json
```

## 📊 Test Coverage

| Test File | Tests | Description |
|---|---|---|
| PolicyEngine.test.ts | 15 | Vault registration, policy management, validation |
| SpendingLimitPolicy.test.ts | 14 | Daily limits, per-tx max, cumulative tracking |
| WhitelistPolicy.test.ts | 12 | Per-vault, global, batch operations |
| TimelockPolicy.test.ts | 11 | Cooldowns, emergency reset |
| MultiSigPolicy.test.ts | 13 | M-of-N setup, approvals, execution |
| RiskScorePolicy.test.ts | 12 | Scoring, thresholds, batch operations |
| PolicyRegistry.test.ts | 10 | Registration, unregistration, queries |
| TreasuryFirewall.test.ts | 12 | Screening, authorization, metrics |
| Treasury.test.ts | 10 | Deposits, transfers, emergency controls |
| Integration.test.ts | 10 | Full pipeline end-to-end |
| **Total** | **119** | **All passing ✅** |

## 📄 License

MIT

---

<div align="center">

**Built for the Arbitrum ecosystem** 🔵

*FortiLayer — Because your treasury deserves a firewall.*

</div>