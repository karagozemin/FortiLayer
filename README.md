<div align="center">

<img src="assets/logo.png" alt="FortiLayer Logo" width="180" />

# FortiLayer

### Programmable Treasury Execution Firewall on Arbitrum

[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-363636?logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19+-yellow?logo=hardhat)](https://hardhat.org/)
[![Arbitrum](https://img.shields.io/badge/Arbitrum-Sepolia-blue?logo=arbitrum)](https://arbitrum.io/)
[![Tests](https://img.shields.io/badge/Tests-110%20passing-brightgreen)](.)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-v5.1-4E5EE4?logo=openzeppelin)](https://openzeppelin.com/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**FortiLayer** is an institutional-grade, modular smart contract framework that acts as a **programmable firewall** for on-chain treasury operations. Every outbound transfer is screened against a composable pipeline of policy modules before execution — enforcing spending limits, whitelists, timelocks, multi-sig governance, and risk scoring in real-time.

[Architecture](#-architecture) · [Contracts](#-contract-overview) · [Policies](#-policy-modules) · [Frontend](#-frontend) · [Quick Start](#-quick-start) · [Demo](#-demo-script) · [Deployment](#-deployed-contracts)

</div>

---

## 🎯 Problem Statement

DAOs and institutional treasuries hold **billions of dollars** on-chain, yet most lack granular, composable execution controls. A single compromised key or rogue governance vote can drain a treasury in a single transaction.

Existing solutions fall short:

| Approach | Limitation |
|---|---|
| **Gnosis Safe** | Multi-sig only — no per-tx rules, no spending limits |
| **Timelock controllers** | Single control dimension — no composability |
| **Hardcoded limits** | Too rigid — can't adapt to changing risk profiles |
| **Approve-and-execute** | Too permissive — one approval enables unlimited execution |

## 💡 Solution

FortiLayer introduces a **firewall layer** between treasury vaults and the blockchain. No transaction can exit the vault without passing through a configurable compliance pipeline:

```
User Request
     │
     ▼
┌──────────┐     ┌──────────────────┐     ┌──────────────┐
│ Treasury │────▶│ TreasuryFirewall │────▶│ PolicyEngine │
│  Vault   │     │  screen & route  │     │ orchestrator │
└──────────┘     └──────────────────┘     └──────┬───────┘
                                                  │
                              ┌────────────────┬──┴──┬────────────────┐
                              ▼                ▼     ▼                ▼
                        ┌──────────┐    ┌─────────┐  ┌─────────┐  ┌──────────┐
                        │ Spending │    │Whitelist│  │Timelock │  │ MultiSig │
                        │  Limit   │    │ Policy  │  │ Policy  │  │  Policy  │
                        └──────────┘    └─────────┘  └─────────┘  └──────────┘
                                                                   ┌──────────┐
                                                                   │  Risk    │
                                  ALL PASS? ──────────────────────▶│  Score   │
                                     │                             └──────────┘
                              ┌──────┴──────┐
                              ▼             ▼
                          ✅ Execute    ❌ Revert
                         ERC-20 Transfer  (policy error)
```

Policies are:
- **Modular** — plug in only what you need per vault
- **Composable** — stack multiple policies; ALL must pass
- **Stateful** — policies track cumulative spending, cooldowns, approval counts across transactions
- **Per-vault configurable** — different vaults can have completely different rule sets

---

## 🏗 Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                        FortiLayer Architecture                              │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         APPLICATION LAYER                             │  │
│  │                                                                       │  │
│  │   React 18 + Vite 5 + Reown AppKit (WalletConnect)                   │  │
│  │   ┌────────────┐ ┌───────────────┐ ┌─────────┐ ┌────────────────┐   │  │
│  │   │ Dashboard  │ │PolicyManager  │ │  Queue  │ │FirewallStatus  │   │  │
│  │   │ mint/fund/ │ │ configure all │ │  tx     │ │ emergency ctrl │   │  │
│  │   │ transfer   │ │ 5 policies    │ │ history │ │ pause/unpause  │   │  │
│  │   └──────┬─────┘ └───────┬───────┘ └────┬────┘ └───────┬────────┘   │  │
│  └──────────┼───────────────┼──────────────┼──────────────┼────────────┘  │
│             │               │              │              │                │
│  ┌──────────┼───────────────┼──────────────┼──────────────┼────────────┐  │
│  │          ▼               ▼              ▼              ▼            │  │
│  │                     SMART CONTRACT LAYER                            │  │
│  │                                                                     │  │
│  │  ┌─────────────┐    ┌──────────────────┐    ┌───────────────────┐  │  │
│  │  │  Treasury   │───▶│ TreasuryFirewall │───▶│   PolicyEngine    │  │  │
│  │  │             │    │                  │    │                   │  │  │
│  │  │ • deposit() │    │ • screenAndExec()│    │ • validateTx()   │  │  │
│  │  │ • request() │    │ • metrics        │    │ • recordTx()     │  │  │
│  │  │ • pause()   │    │ • pause()        │    │ • addPolicy()    │  │  │
│  │  │ • roles     │    │ • authorize      │    │ • removePolicy() │  │  │
│  │  └─────────────┘    └──────────────────┘    └────────┬──────────┘  │  │
│  │                                                       │            │  │
│  │                         ┌──────────────────┬──────────┼─────┐      │  │
│  │                         ▼                  ▼          ▼     ▼      │  │
│  │                  ┌────────────┐     ┌──────────┐ ┌──────┐ ┌────┐  │  │
│  │                  │ Spending   │     │Whitelist │ │Time- │ │Mul-│  │  │
│  │                  │ Limit      │     │ Policy   │ │lock  │ │ti- │  │  │
│  │                  │ Policy     │     │          │ │Pol.  │ │Sig │  │  │
│  │                  └────────────┘     └──────────┘ └──────┘ └────┘  │  │
│  │                                                           ┌────┐  │  │
│  │  ┌──────────────────┐   ┌───────────────────────┐        │Risk│  │  │
│  │  │ PolicyRegistry   │   │ TransactionExecutor   │        │Sc. │  │  │
│  │  │ approved policy  │   │ role-based final exec  │        │Pol.│  │  │
│  │  │ catalog          │   │ unique tx IDs          │        └────┘  │  │
│  │  └──────────────────┘   └───────────────────────┘                 │  │
│  │                                                                    │  │
│  │  ┌──────────┐  ┌────────────────────────────────────────────────┐ │  │
│  │  │ MockUSDC │  │  BasePolicy (abstract)                        │ │  │
│  │  │ test ERC │  │  • onlyPolicyEngine modifier                  │ │  │
│  │  │ 20 token │  │  • onlyOwner modifier                         │ │  │
│  │  └──────────┘  │  • validate() — override in each policy       │ │  │
│  │                │  • recordTransaction() — post-exec tracking   │ │  │
│  │                └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      NETWORK: Arbitrum Sepolia                    │  │
│  │              Low gas · EVM equivalent · Fast finality             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Transaction Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    TRANSACTION LIFECYCLE                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. REQUEST                                                              │
│     User calls Treasury.requestTransfer(token, recipient, amount)        │
│     Treasury approves firewall to spend tokens                           │
│                              │                                           │
│  2. SCREEN                   ▼                                           │
│     TreasuryFirewall.screenAndExecute(vault, token, to, amount)          │
│     Increments totalScreened counter                                     │
│                              │                                           │
│  3. VALIDATE                 ▼                                           │
│     PolicyEngine.validateTransaction(vault, token, to, amount)           │
│     ┌─ for each policy in vault.policies:                                │
│     │    policy.validate(vault, token, to, amount)  ← view call         │
│     │    if reverts → TransactionNotCompliant ❌                         │
│     └─ all passed ✅                                                     │
│                              │                                           │
│  4. RECORD                   ▼                                           │
│     PolicyEngine calls policy.recordTransaction() on each policy         │
│     ┌─ SpendingLimit: adds to daily cumulative spend                     │
│     │  Timelock: updates lastTransactionTime                             │
│     │  MultiSig: clears approval state for this tx                       │
│     └─ Others: no-op                                                     │
│                              │                                           │
│  5. EXECUTE                  ▼                                           │
│     TreasuryFirewall transfers tokens via SafeERC20                      │
│     Increments totalPassed counter                                       │
│     Emits TransactionScreened event                                      │
│                              │                                           │
│  6. CONFIRM                  ▼                                           │
│     Transaction hash returned to frontend                                │
│     UI waits for receipt → shows success toast                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Two-Phase Validation Pattern

FortiLayer uses a **validate-then-record** pattern to ensure atomicity:

```
Phase 1: validate()          Phase 2: recordTransaction()
┌─────────────────────┐      ┌─────────────────────────────┐
│ • Pure view call    │      │ • State-changing call        │
│ • No gas for writes │ ───▶ │ • Only after ALL pass        │
│ • Reverts with      │      │ • Called by PolicyEngine      │
│   custom errors     │      │ • onlyPolicyEngine modifier  │
│ • Can be simulated  │      │ • Updates cumulative state   │
│   off-chain         │      │ • Atomic with execution      │
└─────────────────────┘      └─────────────────────────────┘
```

This separation ensures:
1. **No state pollution** if any policy fails
2. **Off-chain simulation** possible before submitting tx
3. **Gas-efficient reverts** — no state rollback needed
4. **Atomic recording** — either all policies record or none do

---

## 📜 Contract Overview

### Core Infrastructure (3 contracts)

| Contract | LOC | Purpose | OpenZeppelin |
|---|---|---|---|
| **PolicyEngine** | 227 | Central orchestrator — validates txs against all vault policies, manages vault registration and policy composition | Ownable, Pausable, ReentrancyGuard |
| **TreasuryFirewall** | 171 | Execution gateway — intercepts transfers, delegates to PolicyEngine, executes if compliant, tracks screening metrics | Ownable, Pausable, ReentrancyGuard, SafeERC20 |
| **TransactionExecutor** | 100 | Role-based final executor with unique transaction ID generation | AccessControl, ReentrancyGuard, SafeERC20 |

### Treasury (1 contract)

| Contract | LOC | Purpose | OpenZeppelin |
|---|---|---|---|
| **Treasury** | 195 | Institutional vault — deposit, transfer-via-firewall, emergency pause. Three roles: ADMIN, EXECUTOR, PAUSER | AccessControl, Pausable, ReentrancyGuard, SafeERC20 |

### Policy Modules (5 contracts + 1 abstract base)

| Contract | LOC | Purpose |
|---|---|---|
| **BasePolicy** | 88 | Abstract base — `onlyPolicyEngine` auth, `onlyOwner` config, default `recordTransaction` no-op |
| **SpendingLimitPolicy** | 215 | Daily cumulative limits + per-tx maximums. Auto-resets at UTC day boundaries. Per-vault overrides |
| **WhitelistPolicy** | 220 | Per-vault recipient allowlists. Batch add/remove. Global whitelist support |
| **TimelockPolicy** | 177 | Cooldown period between consecutive txs. Per-vault configurable duration. Emergency reset |
| **MultiSigPolicy** | 291 | M-of-N signer approval. Auto-registers signers on approval (demo mode). Clears approvals post-execution |
| **RiskScorePolicy** | 188 | 0–100 risk scores per address (higher = safer). Configurable min threshold. Batch scoring |

### Infrastructure (2 contracts)

| Contract | LOC | Purpose |
|---|---|---|
| **PolicyRegistry** | 95 | Global catalog of approved policy implementations |
| **MockUSDC** | 40 | Test ERC-20 with public `mint()` for development |

### Interfaces (5)

`IPolicy` · `IPolicyEngine` · `IPolicyRegistry` · `ITreasury` · `ITreasuryFirewall`

> **Total: 17 Solidity files · ~2,300 lines of auditable code**

---

## 🛡 Policy Modules

### 1. 💳 SpendingLimitPolicy

Enforces **daily cumulative limits** and **per-transaction maximums**. Prevents treasury drain by limiting how much can leave the vault in a 24-hour window.

```
┌─ Validation ──────────────────────────────────────────┐
│                                                        │
│  amount ≤ maxTxAmount?           ── per-tx check       │
│  dailySpent + amount ≤ dailyLimit? ── cumulative check │
│                                                        │
│  ✅ Pass → recordTransaction() adds to dailySpent      │
│  ❌ Fail → revert DailyLimitExceeded / MaxTxExceeded   │
│                                                        │
│  Auto-resets at UTC day boundary                       │
└────────────────────────────────────────────────────────┘
```

**Configurable:** `setVaultDailyLimit()` · `setVaultMaxTxAmount()`

### 2. ✅ WhitelistPolicy

Only **pre-approved recipient addresses** can receive funds. Zero-trust model — if you're not on the list, the transfer reverts.

```
┌─ Validation ──────────────────────────────────────────┐
│                                                        │
│  isWhitelisted(vault, recipient)?                      │
│                                                        │
│  ✅ Pass → recipient is on vault's whitelist           │
│  ❌ Fail → revert RecipientNotWhitelisted              │
└────────────────────────────────────────────────────────┘
```

**Configurable:** `addToVaultWhitelist()` · `removeFromVaultWhitelist()` · `batchAddToVaultWhitelist()`

### 3. ⏱ TimelockPolicy

Enforces a **cooldown period** between consecutive transactions. Prevents rapid-fire drain attacks where an attacker tries to submit many transactions in quick succession.

```
┌─ Validation ──────────────────────────────────────────┐
│                                                        │
│  now ≥ lastTxTime + timelockDuration?                  │
│                                                        │
│  ✅ Pass → recordTransaction() updates lastTxTime      │
│  ❌ Fail → revert TimelockNotExpired(unlockTime)       │
└────────────────────────────────────────────────────────┘
```

**Configurable:** `setVaultTimelockDuration()`

### 4. ✍️ MultiSigPolicy

Requires **M-of-N signer approvals** before a transaction can execute. Transaction identity is computed as `keccak256(vault, token, recipient, amount)`.

```
┌─ Flow ────────────────────────────────────────────────┐
│                                                        │
│  1. Signer calls approveTransaction(vault,token,to,amt)│
│     → auto-registers as signer if new (demo mode)     │
│     → increments approval count for txHash             │
│                                                        │
│  2. Repeat until approvalCount ≥ requiredApprovals     │
│                                                        │
│  3. validate() checks: approvalCount ≥ threshold?      │
│     ✅ Pass → recordTransaction() clears all approvals │
│     ❌ Fail → revert InsufficientApprovals             │
└────────────────────────────────────────────────────────┘
```

**Configurable:** `addSigner()` · `removeSigner()` · `setRequiredApprovals()`

### 5. 📈 RiskScorePolicy

Assigns **0–100 risk scores** to addresses (higher = safer). Blocks transfers to addresses scoring below a configurable minimum threshold.

```
┌─ Validation ──────────────────────────────────────────┐
│                                                        │
│  score = getRiskScore(recipient)                       │
│  score ≥ minThreshold?                                 │
│                                                        │
│  ✅ Pass → recipient has acceptable risk level         │
│  ❌ Fail → revert RiskScoreTooLow(addr, score, min)   │
└────────────────────────────────────────────────────────┘
```

**Configurable:** `setRiskScore()` · `batchSetRiskScores()` · `setMinThreshold()` · `setDefaultScore()`

### Writing Custom Policies

Extend `BasePolicy` and implement the `validate()` function:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BasePolicy.sol";

contract GeoBlockPolicy is BasePolicy {
    mapping(address => bool) public blocked;

    constructor(address engine) BasePolicy(engine) {}

    function policyName() external pure override returns (string memory) {
        return "GeoBlockPolicy";
    }

    function validate(
        address,       // vault
        address,       // token
        address to,
        uint256        // amount
    ) external view override returns (bool) {
        require(!blocked[to], "Recipient is geo-blocked");
        return true;
    }
}
```

Register it: `policyEngine.addPolicy(vaultAddress, geoPolicyAddress)`

---

## 🔒 Security Model

### Defense in Depth

```
Layer 1: ACCESS CONTROL
  └─ Role-based (ADMIN / EXECUTOR / PAUSER)
  └─ Per-vault policy ownership
  └─ onlyPolicyEngine for state mutations

Layer 2: EXECUTION FIREWALL
  └─ Every transfer must pass through TreasuryFirewall
  └─ No direct token transfer possible from vault
  └─ Treasury approves firewall → firewall executes

Layer 3: POLICY PIPELINE
  └─ ALL policies must pass (AND logic)
  └─ Each policy has independent validation logic
  └─ Composable — add/remove without affecting others

Layer 4: CIRCUIT BREAKERS
  └─ PolicyEngine.pause() — freezes all validation
  └─ TreasuryFirewall.pause() — freezes all execution
  └─ Treasury.pause() — freezes all vault operations
  └─ Any single pause halts the entire pipeline
```

### OpenZeppelin Security Primitives

| Primitive | Usage |
|---|---|
| **ReentrancyGuard** | All state-changing + token-transferring functions |
| **Pausable** | Emergency circuit breaker on PolicyEngine, Firewall, Treasury |
| **Ownable** | Admin configuration of core contracts |
| **AccessControl** | Role-based permissions on Treasury and Executor |
| **SafeERC20** | All token operations use safe wrappers |

### Custom Error Pattern

All contracts use gas-efficient custom errors with descriptive parameters:

```solidity
error DailyLimitExceeded(address vault, uint256 spent, uint256 limit);
error RecipientNotWhitelisted(address vault, address recipient);
error TimelockNotExpired(address vault, uint256 unlockTime);
error InsufficientApprovals(bytes32 txHash, uint256 current, uint256 required);
error RiskScoreTooLow(address recipient, uint256 score, uint256 threshold);
```

The frontend parses these errors and displays human-readable messages.

---

## 🖥 Frontend

A full-featured **React 18 + Vite 5** dashboard for interacting with all deployed contracts.

### Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 18.2 | UI framework |
| Vite | 5.x | Build tool & dev server |
| ethers.js | 6.16 | Blockchain interaction |
| Reown AppKit | 1.8.18 | WalletConnect integration |
| TypeScript | 5.3 | Type safety |

### Pages

| Page | Features |
|---|---|
| **Dashboard** | Mint test USDC · Deposit to Treasury · Transfer with pre-flight policy validation · Real-time balance display |
| **Policy Manager** | View all 5 active policies · Configure each policy's parameters · MultiSig: Approve/Revoke transactions, check status, manage signers |
| **Transactions** | Transaction history timeline · Pass/block status badges · Arbiscan links |
| **Firewall Status** | System health overview · Architecture visualization · Emergency pause/unpause for all 3 contracts |

### Pre-Flight Policy Validation

Before submitting a transfer, the frontend calls `validate()` on each active policy off-chain. If any policy would reject, it shows the specific error **without wasting gas**:

```
User clicks "Transfer"
     │
     ▼
Frontend: policyEngine.getVaultPolicies(treasury)
     │
     ▼
For each policy:
  policy.validate(vault, token, to, amount)  ← static call, no gas
     │
     ├─ Any revert? → Show "WhitelistPolicy: Recipient not whitelisted" ❌
     │
     └─ All pass? → Submit real transaction ✅
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** or **yarn**
- A wallet with Arbitrum Sepolia ETH ([faucet](https://faucet.arbitrum.io/))

### 1. Install & Compile

```bash
cd arbitrum-policy-engine
npm install
npx hardhat compile
```

### 2. Run Tests

```bash
npx hardhat test
```

```
  110 passing
  9 pending
```

### 3. Run Demo

```bash
npx hardhat run scripts/demo.ts
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** and connect your wallet.

### 5. Deploy to Arbitrum Sepolia

```bash
# Set up environment
cp .env.example .env
# Fill in DEPLOYER_PRIVATE_KEY and ARBISCAN_API_KEY

# Deploy all contracts
npx hardhat run scripts/deploy.ts --network arbitrumSepolia

# Verify on Arbiscan
npx hardhat verify --network arbitrumSepolia <CONTRACT_ADDRESS>
```

---

## 🎮 Demo Script

The demo script (`scripts/demo.ts`) deploys a complete environment and demonstrates all 5 policies:

| Step | Action | Result |
|---|---|---|
| 1 | Deploy all contracts, configure vault with 5 policies | ✅ Setup complete |
| 2 | Mint 10,000 USDC and deposit to Treasury | ✅ Funded |
| 3 | Transfer 1,000 USDC to whitelisted address (all policies pass) | ✅ **Successful** |
| 4 | Transfer 6,000 USDC (exceeds 5,000 daily limit) | ❌ **Blocked** — SpendingLimitPolicy |
| 5 | Transfer to non-whitelisted address | ❌ **Blocked** — WhitelistPolicy |
| 6 | Transfer to address with risk score 20 (threshold: 50) | ❌ **Blocked** — RiskScorePolicy |
| 7 | Transfer without multi-sig approval | ❌ **Blocked** — MultiSigPolicy |
| 8 | Emergency pause → attempt transfer → unpause | ❌ **Blocked** → ✅ Resumed |

```
======================================
  FortiLayer Demo Summary
======================================
 Step 1: Deploy & Configure     ✅ PASS
 Step 2: Fund Treasury          ✅ PASS
 Step 3: Valid Transfer          ✅ PASS
 Step 4: Over-Limit Transfer    ❌ BLOCKED (SpendingLimitPolicy)
 Step 5: Non-Whitelisted        ❌ BLOCKED (WhitelistPolicy)
 Step 6: Risky Address          ❌ BLOCKED (RiskScorePolicy)
 Step 7: No MultiSig Approval   ❌ BLOCKED (MultiSigPolicy)
 Step 8: Emergency Pause        ❌ BLOCKED → ✅ Resumed
======================================
```

---

## 📋 Deployed Contracts

> **Network: Arbitrum Sepolia (Chain ID: 421614)**

| Contract | Address | Verified |
|---|---|---|
| **PolicyEngine** | [`0x245118Fb...08327D9`](https://sepolia.arbiscan.io/address/0x245118Fba999F1ed338174933f83bdD6e08327D9) | ✅ |
| **TreasuryFirewall** | [`0xE3Be337B...013EE98`](https://sepolia.arbiscan.io/address/0xE3Be337BdC98Af11D3C8bcaB9149356Ac013EE98) | ✅ |
| **PolicyRegistry** | [`0x5f36947d...70DAff`](https://sepolia.arbiscan.io/address/0x5f36947d6d829616bAd785Be7eCb13cf9370DAff) | ✅ |
| **Treasury** | [`0x9BcF0E12...C52E`](https://sepolia.arbiscan.io/address/0x9BcF0E126b82C8E7cC5151C77025b052732eC52E) | ✅ |
| **MockUSDC** | [`0xee71e4d5...6Ee1e9`](https://sepolia.arbiscan.io/address/0xee71e4d5b0D6588FFdf5713f9791eD63e66Ee1e9) | ✅ |
| **SpendingLimitPolicy** | [`0x17580a55...2d8F35`](https://sepolia.arbiscan.io/address/0x17580a550087C55CF68AD9Cc19F56862d8F35AEf) | ✅ |
| **WhitelistPolicy** | [`0x1EdaAD6c...d2d6df`](https://sepolia.arbiscan.io/address/0x1EdaAD6c6F5C8d5fb901e83f73b3BD0D29d2d6df) | ✅ |
| **TimelockPolicy** | [`0xa9BB981a...5062d`](https://sepolia.arbiscan.io/address/0xa9BB981a309DEf9b74A390f2170fE56C2085062d) | ✅ |
| **MultiSigPolicy** | [`0x880107...c624`](https://sepolia.arbiscan.io/address/0x88010789fF9109A00912F9a9a62414D819ffc624) | ✅ |
| **RiskScorePolicy** | [`0x543058...8924`](https://sepolia.arbiscan.io/address/0x54305829743e301ebF8D868037B4081c90848924) | ✅ |

> All 10 contracts verified on Arbiscan with full source code.

### Active Vault Configuration

The Treasury vault has **5 active policies**:

```
SpendingLimitPolicy  → Daily: 10,000 USDC · Max/tx: 5,000 USDC
WhitelistPolicy      → 2 whitelisted addresses
TimelockPolicy       → 5 second cooldown
MultiSigPolicy       → 1 of N signers (auto-register)
RiskScorePolicy      → Min threshold: 50/100
```

---

## 📁 Project Structure

```
FortiLayer/
├── README.md
├── assets/
│   └── logo.png
│
└── arbitrum-policy-engine/
    ├── hardhat.config.ts                  # Solidity 0.8.20 · optimizer 200 · viaIR
    ├── package.json
    │
    ├── contracts/                         # 17 Solidity files · ~2,300 LOC
    │   ├── core/
    │   │   ├── PolicyEngine.sol
    │   │   ├── TreasuryFirewall.sol
    │   │   └── TransactionExecutor.sol
    │   ├── interfaces/
    │   │   ├── IPolicy.sol
    │   │   ├── IPolicyEngine.sol
    │   │   ├── IPolicyRegistry.sol
    │   │   ├── ITreasury.sol
    │   │   └── ITreasuryFirewall.sol
    │   ├── policies/
    │   │   ├── BasePolicy.sol
    │   │   ├── SpendingLimitPolicy.sol
    │   │   ├── WhitelistPolicy.sol
    │   │   ├── TimelockPolicy.sol
    │   │   ├── MultiSigPolicy.sol
    │   │   └── RiskScorePolicy.sol
    │   ├── registry/
    │   │   └── PolicyRegistry.sol
    │   ├── treasury/
    │   │   └── Treasury.sol
    │   └── mocks/
    │       └── MockUSDC.sol
    │
    ├── test/                              # 10 test files · 110 passing
    │   ├── PolicyEngine.test.ts
    │   ├── SpendingLimitPolicy.test.ts
    │   ├── WhitelistPolicy.test.ts
    │   ├── TimelockPolicy.test.ts
    │   ├── MultiSigPolicy.test.ts
    │   ├── RiskScorePolicy.test.ts
    │   ├── PolicyRegistry.test.ts
    │   ├── TreasuryFirewall.test.ts
    │   ├── Treasury.test.ts
    │   └── Integration.test.ts
    │
    ├── scripts/
    │   ├── deploy.ts                      # Full deployment + configuration
    │   ├── demo.ts                        # 8-step interactive demo
    │   └── status.ts                      # Query all contract states
    │
    └── frontend/                          # React 18 + Vite 5
        ├── vite.config.ts
        ├── index.html
        ├── public/                        # Favicons, logos
        └── src/
            ├── App.tsx                    # Sidebar navigation
            ├── main.tsx                   # AppKit provider
            ├── index.css                  # Design system (~660 lines)
            ├── config/appkit.ts           # WalletConnect config
            ├── hooks/useWallet.tsx         # Wallet context
            ├── components/
            │   ├── Dashboard.tsx          # Mint · Deposit · Transfer
            │   ├── PolicyManager.tsx      # All 5 policy UIs
            │   ├── TransactionQueue.tsx   # Tx history
            │   ├── FirewallStatus.tsx     # Emergency controls
            │   ├── Icons.tsx             # SVG icon library
            │   └── Toast.tsx             # Notifications
            ├── utils/contracts.ts         # ABIs · addresses · helpers
            └── types/index.ts
```

---

## 📊 Test Coverage

| Test File | Tests | Key Scenarios |
|---|---|---|
| PolicyEngine.test.ts | 15 | Vault registration, policy add/remove, multi-policy validation, pause |
| SpendingLimitPolicy.test.ts | 14 | Daily cumulative, per-tx max, day boundary reset, vault overrides |
| WhitelistPolicy.test.ts | 12 | Per-vault lists, batch operations, removal |
| TimelockPolicy.test.ts | 11 | Cooldown enforcement, expiry, duration changes |
| MultiSigPolicy.test.ts | 14 | Auto-register signers, approve/revoke, threshold, clear-on-execute |
| RiskScorePolicy.test.ts | 12 | Score assignment, threshold check, batch scoring, defaults |
| PolicyRegistry.test.ts | 10 | Register, unregister, duplicate prevention |
| TreasuryFirewall.test.ts | 12 | Screen & execute, pass/block metrics, authorization |
| Treasury.test.ts | 10 | Deposit, firewall transfer, emergency pause, roles |
| Integration.test.ts | — | Full pipeline end-to-end with all 5 policies |
| **Total** | **110 passing · 9 pending** | |

> 9 pending tests are access-control checks intentionally skipped in demo mode.

---

## 🏛 Why Arbitrum?

| Factor | Benefit for FortiLayer |
|---|---|
| **Low gas costs** | Multi-policy validation (5+ contract calls per tx) is economically viable at ~$0.001 |
| **EVM equivalence** | Standard Solidity 0.8.20 + OpenZeppelin v5 — no custom tooling |
| **Fast finality** | ~250ms block times enable real-time transaction screening |
| **Largest L2 by TVL** | Growing institutional adoption makes FortiLayer immediately relevant |
| **Arbitrum Orbit** | Custom L3 chains can embed FortiLayer as a native compliance layer |

---

## 🗺 Roadmap

- [x] Core architecture (PolicyEngine, TreasuryFirewall, Treasury)
- [x] 5 composable policy modules
- [x] Comprehensive test suite (110 tests)
- [x] Deploy & verify 10 contracts on Arbitrum Sepolia
- [x] React dashboard with WalletConnect
- [x] Interactive 8-step demo script
- [x] MultiSig policy with approve/revoke/status UI
- [ ] Mainnet deployment
- [ ] Governance module — policy changes via DAO vote
- [ ] Off-chain oracle integration for risk scores
- [ ] Policy marketplace — deploy & share custom policies
- [ ] Cross-chain treasury support (Arbitrum ↔ Ethereum ↔ Optimism)
- [ ] Formal verification of core contracts

---

## 📄 License

MIT

---

<div align="center">

**Built for the Arbitrum ecosystem** 🔵

*FortiLayer — Because your treasury deserves a firewall.*

[Live Demo](https://fortilayer.vercel.app) · [Arbiscan](https://sepolia.arbiscan.io/address/0x245118Fba999F1ed338174933f83bdD6e08327D9) · [GitHub](https://github.com/karagozemin/FortiLayer)

</div>
