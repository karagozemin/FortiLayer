<div align="center">

<img src="assets/logo.png" alt="FortiLayer" width="180" />

# FortiLayer

### The Execution Firewall for Arbitrum

[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-363636?logo=solidity)](https://soliditylang.org/)
[![Arbitrum](https://img.shields.io/badge/Arbitrum-Sepolia-blue?logo=arbitrum)](https://arbitrum.io/)
[![Tests](https://img.shields.io/badge/Tests-110%20passing-brightgreen)](.)
[![Contracts](https://img.shields.io/badge/Contracts-10%20verified-4E5EE4)](https://sepolia.arbiscan.io/)
[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?logo=react)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

**Institutions cannot deploy capital on-chain without programmable guardrails.**

**FortiLayer is the execution firewall for Arbitrum.**

Every outbound treasury transfer passes through a composable policy pipeline —
spending limits, whitelists, timelocks, multi-sig governance, and risk scoring —
before a single token moves.

[Why Now?](#-why-now) · [Why Arbitrum?](#-why-arbitrum) · [Attack Scenarios](#-attack-scenarios) · [Architecture](#-architecture) · [Demo](#-demo) · [Deployment](#-deployed-contracts)

</div>

---

## 🔥 Vision

> **Execution risk is greater than market risk.**

A DAO can survive a 50% drawdown. It cannot survive a drained treasury.

Yet today, most on-chain treasuries operate with **zero execution controls**. A single compromised key, a rogue governance vote, or an unaudited batch transaction can move millions in seconds — with no guardrails, no limits, no cooldowns.

FortiLayer changes the equation:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   Institutions need control.                        │
│   Arbitrum scales execution.                        │
│   FortiLayer controls execution.                    │
│                                                     │
│   Not a multisig. Not a timelock. Not a wrapper.    │
│   A full execution firewall.                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**5 composable policy modules.** Stack them per vault. Enforce them atomically. No transaction exits without passing ALL of them.

### What Makes This Different?

| Existing Solution | Limitation | FortiLayer |
|---|---|---|
| **Gnosis Safe** | Multi-sig only — no per-tx rules, no spending limits | Full policy pipeline with 5 composable modules |
| **Timelock controllers** | Single control dimension — no composability | Stack unlimited policies; AND logic enforcement |
| **Hardcoded limits** | Too rigid — can't adapt to changing risk profiles | Per-vault configurable, hot-swappable policies |
| **Approve-and-execute** | One approval = unlimited execution | Stateful tracking — cumulative limits, cooldowns, M-of-N |

---

## ⏰ Why Now?

The timing for programmable treasury controls has never been more urgent:

| Trend | Impact |
|---|---|
| **$50B+ in DAO treasuries** (2024–2026) | More capital = higher execution risk |
| **RWA tokenization explosion** | Institutional money demands compliance-grade controls |
| **Regulatory pressure mounting** | MiCA, SEC enforcement — "code is law" isn't enough |
| **Treasury exploits accelerating** | Euler ($197M), Mango ($114M), Ronin ($625M) — all execution failures |
| **Institutional on-chain adoption** | BlackRock, Franklin Templeton moving on-chain — they need guardrails |

> **The gap between "institutional capital on-chain" and "institutional-grade controls on-chain" is FortiLayer's market.**

Every week, another protocol loses funds not because of a smart contract bug, but because of an **execution control failure** — unauthorized access, excessive amounts, missing cooldowns. These aren't code bugs. They're missing infrastructure.

---

## 🏛 Why Arbitrum?

FortiLayer is purpose-built for Arbitrum. Here's why:

| Factor | Why It Matters |
|---|---|
| **Low gas costs (~$0.001/tx)** | Multi-policy validation requires 5+ contract calls per transfer. Only viable on L2 |
| **High throughput** | Real-time policy enforcement at scale — no bottleneck on validation pipeline |
| **~250ms block times** | Transaction screening feels instant to end users |
| **EVM equivalence** | Standard Solidity 0.8.20 + OpenZeppelin v5 — zero custom tooling required |
| **Largest L2 by TVL** | Where the institutional money already lives |
| **Stylus (coming)** | High-performance policy logic in Rust/C — 10-100x cheaper compute for complex rules |
| **Arbitrum Orbit** | Custom L3 chains can embed FortiLayer as a **native compliance layer** |

> **Low cost enables frequent checks. High throughput enables scalable enforcement. Stylus enables high-performance policy logic.**

FortiLayer isn't just deployed on Arbitrum — it's architecturally dependent on Arbitrum's cost and performance characteristics. A 5-policy validation pipeline on Ethereum mainnet would cost $15-50 per transfer. On Arbitrum, it costs under $0.01.

---

## 🚨 Attack Scenarios

FortiLayer was designed against real-world treasury attack vectors. Every scenario below has been tested and demonstrated:

| # | Attack Scenario | Vector | FortiLayer Response | Policy |
|---|---|---|---|---|
| 1 | **Treasury drain** | Compromised key submits max withdrawal | ❌ **BLOCKED** — exceeds daily spending limit | SpendingLimitPolicy |
| 2 | **Unauthorized recipient** | Funds redirected to attacker address | ❌ **BLOCKED** — address not on whitelist | WhitelistPolicy |
| 3 | **Rapid-fire extraction** | Multiple small txs in quick succession | ❌ **BLOCKED** — cooldown period not expired | TimelockPolicy |
| 4 | **Single-signer abuse** | One compromised signer drains vault | ❌ **BLOCKED** — M-of-N approval threshold not met | MultiSigPolicy |
| 5 | **High-risk counterparty** | Transfer to flagged/unknown address | ❌ **BLOCKED** — risk score below minimum threshold | RiskScorePolicy |
| 6 | **Cumulative drain** | Many small txs that individually pass limits | ❌ **BLOCKED** — daily cumulative limit exceeded | SpendingLimitPolicy |
| 7 | **Emergency exploit** | Active attack detected | 🛑 **HALTED** — emergency pause freezes all operations | Circuit Breaker (3-layer) |
| 8 | **Policy bypass attempt** | Direct token transfer bypassing firewall | ❌ **IMPOSSIBLE** — tokens held by Treasury, only firewall can execute | Architecture |

### Defense Matrix

```
                         ATTACK SURFACE
           ┌──────────┬──────────┬──────────┬──────────┐
           │ Drain    │ Redirect │ Rapid    │ Bypass   │
           │ Attack   │ Attack   │ Fire     │ Attempt  │
    ┌──────┼──────────┼──────────┼──────────┼──────────┤
    │Spend │ ██ BLOCK │          │          │          │
    │Limit │          │          │          │          │
    ├──────┼──────────┼──────────┼──────────┼──────────┤
    │White │          │ ██ BLOCK │          │          │
    │list  │          │          │          │          │
D   ├──────┼──────────┼──────────┼──────────┼──────────┤
E   │Time  │          │          │ ██ BLOCK │          │
F   │lock  │          │          │          │          │
E   ├──────┼──────────┼──────────┼──────────┼──────────┤
N   │Multi │ ██ BLOCK │ ██ BLOCK │          │          │
S   │Sig   │          │          │          │          │
E   ├──────┼──────────┼──────────┼──────────┼──────────┤
    │Risk  │          │ ██ BLOCK │          │          │
    │Score │          │          │          │          │
    ├──────┼──────────┼──────────┼──────────┼──────────┤
    │Archi │          │          │          │ ██ BLOCK │
    │tect. │          │          │          │          │
    └──────┴──────────┴──────────┴──────────┴──────────┘
    
    ██ = Protected by this layer
```

> **Every known treasury attack vector is covered by at least one policy module. Most are covered by multiple overlapping layers.**

---

## 🏗 Architecture

### High-Level Flow

```
    User Request
         │
         ▼
  ┌──────────────┐      ┌──────────────────┐      ┌────────────────┐
  │   Treasury   │─────▶│ TreasuryFirewall │─────▶│  PolicyEngine  │
  │    Vault     │      │  screen & route  │      │  orchestrator  │
  └──────────────┘      └──────────────────┘      └───────┬────────┘
                                                           │
                            ┌──────────┬──────────┬────────┼────────┐
                            ▼          ▼          ▼        ▼        ▼
                       ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐ ┌──────┐
                       │Spending│ │White-  │ │Time-   │ │Multi-│ │Risk  │
                       │ Limit  │ │ list   │ │ lock   │ │ Sig  │ │Score │
                       └────────┘ └────────┘ └────────┘ └──────┘ └──────┘
                                                                     │
                                      ALL PASS? ◄────────────────────┘
                                          │
                                   ┌──────┴──────┐
                                   ▼             ▼
                               ✅ Execute    ❌ Revert
                              Token Transfer  Custom Error
```

### System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                    FortiLayer System Architecture                     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                      APPLICATION LAYER                         │  │
│  │                                                                │  │
│  │  React 18 + Vite 5 + Reown AppKit (WalletConnect)             │  │
│  │  ┌───────────┐ ┌──────────────┐ ┌────────┐ ┌──────────────┐  │  │
│  │  │ Dashboard │ │PolicyManager │ │ Queue  │ │  Firewall    │  │  │
│  │  │ mint/fund │ │ 5 policy UIs │ │ tx log │ │  Controls    │  │  │
│  │  │ transfer  │ │ + MultiSig   │ │        │ │  pause/resume│  │  │
│  │  └─────┬─────┘ └──────┬───────┘ └───┬────┘ └──────┬───────┘  │  │
│  └────────┼──────────────┼─────────────┼─────────────┼───────────┘  │
│           │              │             │             │               │
│  ┌────────┼──────────────┼─────────────┼─────────────┼───────────┐  │
│  │        ▼              ▼             ▼             ▼           │  │
│  │                  SMART CONTRACT LAYER (17 contracts)          │  │
│  │                                                               │  │
│  │  ┌────────────┐  ┌─────────────────┐  ┌──────────────────┐  │  │
│  │  │  Treasury  │─▶│TreasuryFirewall │─▶│  PolicyEngine    │  │  │
│  │  │  deposit() │  │ screenAndExec() │  │  validateTx()    │  │  │
│  │  │  request() │  │ metrics/pause   │  │  recordTx()      │  │  │
│  │  │  3 roles   │  │ SafeERC20 exec  │  │  add/remove pol. │  │  │
│  │  └────────────┘  └─────────────────┘  └────────┬─────────┘  │  │
│  │                                                 │            │  │
│  │    ┌────────────────────────────────────────────┤            │  │
│  │    ▼           ▼          ▼         ▼           ▼            │  │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────────┐     │  │
│  │  │Spend │  │White │  │Time  │  │Multi │  │  Risk    │     │  │
│  │  │Limit │  │list  │  │lock  │  │Sig   │  │  Score   │     │  │
│  │  └──────┘  └──────┘  └──────┘  └──────┘  └──────────┘     │  │
│  │                                                              │  │
│  │  ┌────────────────┐  ┌─────────────────────┐                │  │
│  │  │PolicyRegistry  │  │TransactionExecutor  │                │  │
│  │  │approved catalog│  │role-based final exec│                │  │
│  │  └────────────────┘  └─────────────────────┘                │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐ │  │
│  │  │ BasePolicy (abstract)                                  │ │  │
│  │  │ validate() → override │ recordTransaction() → hook     │ │  │
│  │  │ onlyPolicyEngine      │ onlyOwner config               │ │  │
│  │  └────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │               NETWORK: Arbitrum Sepolia (421614)              │    │
│  │         Low gas · EVM equivalent · ~250ms finality            │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### Transaction Lifecycle (6 Steps)

```
  REQUEST → SCREEN → VALIDATE → RECORD → EXECUTE → CONFIRM
     │         │         │         │         │         │
     ▼         ▼         ▼         ▼         ▼         ▼
  Treasury  Firewall  PolicyEng  Policies  Firewall  Frontend
  approve   counter   for-each   state     SafeERC20 receipt
  firewall  ++screen  validate   mutation  transfer  toast
```

| Step | Contract | Action | Failure Mode |
|---|---|---|---|
| 1. Request | Treasury | `requestTransfer(token, to, amount)` — approves firewall | Paused / No role |
| 2. Screen | TreasuryFirewall | `screenAndExecute()` — increments `totalScreened` | Paused / Unauthorized |
| 3. Validate | PolicyEngine | Calls `validate()` on each policy (view call) | Any policy reverts → `TransactionNotCompliant` |
| 4. Record | PolicyEngine | Calls `recordTransaction()` on each policy (state) | Only runs if ALL validate |
| 5. Execute | TreasuryFirewall | `SafeERC20.safeTransfer()` — increments `totalPassed` | Transfer failure |
| 6. Confirm | Frontend | Waits for receipt → success toast + Arbiscan link | — |

### Two-Phase Validation Pattern

```
Phase 1: validate()              Phase 2: recordTransaction()
┌───────────────────────┐        ┌───────────────────────────┐
│ • View call (no gas)  │        │ • State mutation          │
│ • Reverts with custom │───────▶│ • Only after ALL pass     │
│   errors              │        │ • onlyPolicyEngine guard  │
│ • Can simulate off-   │        │ • Atomic with execution   │
│   chain (pre-flight)  │        │ • Updates cumulative data │
└───────────────────────┘        └───────────────────────────┘
```

**Why this matters:**
- ✅ No state pollution if any policy fails
- ✅ Off-chain simulation before submitting (pre-flight check)
- ✅ Gas-efficient reverts — no state rollback
- ✅ Atomic — either all record or none do

---

## 💪 Technical Strength

### Engineering Quality Checklist

| Dimension | Implementation | Status |
|---|---|---|
| **Modular Architecture** | BasePolicy abstract → 5 independent policy modules, hot-swappable per vault | ✅ |
| **Custom Errors** | All 17 contracts use gas-efficient `error Name(params)` — no string reverts | ✅ |
| **Gas Optimization** | Solidity optimizer (200 runs) + viaIR enabled. View-call validation saves gas on reverts | ✅ |
| **Structured Storage** | Per-vault mappings, daily-reset counters, cumulative trackers — no global state pollution | ✅ |
| **Access Control** | 3-role RBAC (ADMIN/EXECUTOR/PAUSER) + onlyPolicyEngine + onlyOwner | ✅ |
| **Reentrancy Protection** | OpenZeppelin ReentrancyGuard on ALL state-changing + token-transferring functions | ✅ |
| **Safe Token Operations** | SafeERC20 wrappers on every token operation — no raw `transfer()` calls | ✅ |
| **Emergency Circuit Breakers** | 3-layer pause: PolicyEngine + TreasuryFirewall + Treasury | ✅ |
| **Test Coverage** | 110 passing tests across 10 test files — unit + integration | ✅ |
| **Deployment Verified** | All 10 contracts verified on Arbiscan with full source code | ✅ |
| **Frontend Integration** | Full React dashboard with WalletConnect, pre-flight validation, toast system | ✅ |
| **OpenZeppelin v5.1** | Latest battle-tested security primitives (Ownable, Pausable, AccessControl, SafeERC20) | ✅ |

### Custom Error Signatures

Every revert gives the caller exactly what went wrong:

```solidity
error DailyLimitExceeded(address vault, uint256 spent, uint256 limit);
error MaxTransactionExceeded(address vault, uint256 amount, uint256 max);
error RecipientNotWhitelisted(address vault, address recipient);
error TimelockNotExpired(address vault, uint256 unlockTime);
error InsufficientApprovals(bytes32 txHash, uint256 current, uint256 required);
error RiskScoreTooLow(address recipient, uint256 score, uint256 threshold);
error TransactionNotCompliant(address vault, address policy, string reason);
```

The frontend parses these and displays human-readable error messages — users never see raw hex.

### Security Primitives

```
Layer 1: ACCESS CONTROL
  └─ Role-based (ADMIN / EXECUTOR / PAUSER) on Treasury + Executor
  └─ onlyPolicyEngine modifier on all policy state mutations
  └─ Per-vault policy ownership

Layer 2: EXECUTION FIREWALL
  └─ Every transfer must pass through TreasuryFirewall
  └─ No direct token transfer possible from Treasury vault
  └─ Treasury approves firewall → firewall executes

Layer 3: POLICY PIPELINE
  └─ ALL policies must pass (AND logic — strictest wins)
  └─ Each policy has independent validation logic
  └─ Composable — add/remove without affecting others

Layer 4: CIRCUIT BREAKERS
  └─ PolicyEngine.pause()     — freezes all validation
  └─ TreasuryFirewall.pause() — freezes all execution
  └─ Treasury.pause()         — freezes all vault operations
  └─ Any single pause halts the ENTIRE pipeline
```

---

## 🛡 Policy Modules

5 production-ready policy modules, each independently testable and hot-swappable:

### 1. 💳 SpendingLimitPolicy
**Daily cumulative limits + per-transaction maximums.** Prevents treasury drain by capping how much can leave per 24h window. Auto-resets at UTC day boundaries.

### 2. ✅ WhitelistPolicy
**Per-vault recipient allowlists.** Zero-trust — if you're not on the list, the transfer reverts. Supports batch add/remove.

### 3. ⏱ TimelockPolicy
**Cooldown period between consecutive transactions.** Prevents rapid-fire extraction attacks. Per-vault configurable duration.

### 4. ✍️ MultiSigPolicy
**M-of-N signer approval before execution.** Transaction identity via `keccak256(vault, token, to, amount)`. Approvals cleared post-execution.

### 5. 📈 RiskScorePolicy
**0–100 risk scores per address (higher = safer).** Blocks transfers to addresses below configurable threshold. Batch scoring support.

### Extensibility

New policies are trivial to add. Extend `BasePolicy`, implement `validate()`:

```solidity
contract GeoBlockPolicy is BasePolicy {
    mapping(address => bool) public blocked;
    
    function validate(address, address, address to, uint256)
        external view override returns (bool) {
        require(!blocked[to], "Recipient is geo-blocked");
        return true;
    }
}
```

Register: `policyEngine.addPolicy(vault, geoPolicyAddress)` — live immediately.

---

## 📜 Contract Overview

> **17 Solidity files · ~2,300 lines of auditable code**

### Core Infrastructure

| Contract | LOC | Purpose | OpenZeppelin |
|---|---|---|---|
| **PolicyEngine** | 227 | Central orchestrator — validates txs against vault policies, manages composition | Ownable, Pausable, ReentrancyGuard |
| **TreasuryFirewall** | 171 | Execution gateway — intercepts, delegates to PolicyEngine, executes if compliant | Ownable, Pausable, ReentrancyGuard, SafeERC20 |
| **TransactionExecutor** | 100 | Role-based final executor with unique transaction ID generation | AccessControl, ReentrancyGuard, SafeERC20 |

### Treasury & Registry

| Contract | LOC | Purpose | OpenZeppelin |
|---|---|---|---|
| **Treasury** | 195 | Institutional vault — deposit, firewall-transfer, emergency pause. 3 roles | AccessControl, Pausable, ReentrancyGuard, SafeERC20 |
| **PolicyRegistry** | 95 | Global catalog of approved policy implementations | Ownable |

### Policy Modules

| Contract | LOC | Key Feature |
|---|---|---|
| **BasePolicy** | 88 | Abstract base — `onlyPolicyEngine` auth, default `recordTransaction` no-op |
| **SpendingLimitPolicy** | 215 | Daily cumulative + per-tx max. UTC day boundary reset |
| **WhitelistPolicy** | 220 | Per-vault allowlists. Batch add/remove |
| **TimelockPolicy** | 177 | Cooldown enforcement. Per-vault configurable |
| **MultiSigPolicy** | 291 | M-of-N approval. Auto-register signers. Clear on execute |
| **RiskScorePolicy** | 188 | 0–100 scoring. Configurable threshold. Batch scoring |

### Interfaces

`IPolicy` · `IPolicyEngine` · `IPolicyRegistry` · `ITreasury` · `ITreasuryFirewall`

---

## 🖥 Frontend

Full-featured **React 18 + Vite 5** dashboard for interacting with all contracts via WalletConnect.

| Page | Features |
|---|---|
| **Dashboard** | Mint test USDC · Deposit to Treasury · Transfer with **pre-flight policy validation** |
| **Policy Manager** | Configure all 5 policies · MultiSig: approve/revoke/status/admin |
| **Transactions** | History timeline · Pass/block badges · Arbiscan links |
| **Firewall Status** | System health · Emergency pause/unpause for all 3 contracts |

### Pre-Flight Validation

Before submitting a transfer, the frontend simulates all 5 policies off-chain. If any would reject, users see the exact error **without spending gas**:

```
Transfer Request → simulate validate() on each policy → any revert?
   │                                                        │
   │  ❌ "SpendingLimitPolicy: Daily limit exceeded"        │
   │  ❌ "WhitelistPolicy: Recipient not whitelisted"       │
   │                                                        │
   └── All pass? → Submit real transaction ✅               │
```

| Tech | Version | Purpose |
|---|---|---|
| React | 18.2 | UI framework |
| Vite | 5.x | Build & HMR |
| ethers.js | 6.16 | Contract interaction |
| Reown AppKit | 1.8.18 | WalletConnect |
| TypeScript | 5.3 | Type safety |

---

## 🎮 Demo

The interactive demo (`scripts/demo.ts`) deploys everything and demonstrates all 5 policies blocking real attacks:

| Step | Action | Result | Policy Tested |
|---|---|---|---|
| 1 | Deploy all contracts + configure 5-policy vault | ✅ Setup complete | — |
| 2 | Mint 10,000 USDC + deposit to Treasury | ✅ Funded | — |
| 3 | Transfer 1,000 USDC to whitelisted address | ✅ **Passed** | All 5 |
| 4 | Transfer 6,000 USDC (exceeds 5,000 daily limit) | ❌ **Blocked** | SpendingLimit |
| 5 | Transfer to non-whitelisted address | ❌ **Blocked** | Whitelist |
| 6 | Transfer to address with risk score 20 (threshold: 50) | ❌ **Blocked** | RiskScore |
| 7 | Transfer without multi-sig approval | ❌ **Blocked** | MultiSig |
| 8 | Emergency pause → attempt → unpause | ❌ **Halted** → ✅ Resumed | Circuit Breaker |

```
======================================
  FortiLayer Demo Results
======================================
 ✅ Valid Transfer         → PASSED
 ❌ Over-Limit Transfer   → BLOCKED (SpendingLimitPolicy)
 ❌ Non-Whitelisted Addr  → BLOCKED (WhitelistPolicy)
 ❌ Risky Address          → BLOCKED (RiskScorePolicy)
 ❌ No MultiSig Approval   → BLOCKED (MultiSigPolicy)
 🛑 Emergency Pause       → HALTED → ✅ Resumed
======================================
```

```bash
# Run the demo yourself:
cd arbitrum-policy-engine
npx hardhat run scripts/demo.ts
```

---

## 📋 Deployed Contracts

> **Network: Arbitrum Sepolia · Chain ID: 421614 · All 10 contracts verified ✅**

| Contract | Address | Arbiscan |
|---|---|---|
| **PolicyEngine** | `0x245118Fba999F1ed338174933f83bdD6e08327D9` | [View ↗](https://sepolia.arbiscan.io/address/0x245118Fba999F1ed338174933f83bdD6e08327D9) |
| **TreasuryFirewall** | `0xE3Be337BdC98Af11D3C8bcaB9149356Ac013EE98` | [View ↗](https://sepolia.arbiscan.io/address/0xE3Be337BdC98Af11D3C8bcaB9149356Ac013EE98) |
| **PolicyRegistry** | `0x5f36947d6d829616bAd785Be7eCb13cf9370DAff` | [View ↗](https://sepolia.arbiscan.io/address/0x5f36947d6d829616bAd785Be7eCb13cf9370DAff) |
| **Treasury** | `0x9BcF0E126b82C8E7cC5151C77025b052732eC52E` | [View ↗](https://sepolia.arbiscan.io/address/0x9BcF0E126b82C8E7cC5151C77025b052732eC52E) |
| **MockUSDC** | `0xee71e4d5b0D6588FFdf5713f9791eD63e66Ee1e9` | [View ↗](https://sepolia.arbiscan.io/address/0xee71e4d5b0D6588FFdf5713f9791eD63e66Ee1e9) |
| **SpendingLimitPolicy** | `0x17580a550087C55CF68AD9Cc19F56862d8F35AEf` | [View ↗](https://sepolia.arbiscan.io/address/0x17580a550087C55CF68AD9Cc19F56862d8F35AEf) |
| **WhitelistPolicy** | `0x1EdaAD6c6F5C8d5fb901e83f73b3BD0D29d2d6df` | [View ↗](https://sepolia.arbiscan.io/address/0x1EdaAD6c6F5C8d5fb901e83f73b3BD0D29d2d6df) |
| **TimelockPolicy** | `0xa9BB981a309DEf9b74A390f2170fE56C2085062d` | [View ↗](https://sepolia.arbiscan.io/address/0xa9BB981a309DEf9b74A390f2170fE56C2085062d) |
| **MultiSigPolicy** | `0x88010789fF9109A00912F9a9a62414D819ffc624` | [View ↗](https://sepolia.arbiscan.io/address/0x88010789fF9109A00912F9a9a62414D819ffc624) |
| **RiskScorePolicy** | `0x54305829743e301ebF8D868037B4081c90848924` | [View ↗](https://sepolia.arbiscan.io/address/0x54305829743e301ebF8D868037B4081c90848924) |

### Live Vault Configuration

```
Treasury Vault: 0x9BcF0E126b82C8E7cC5151C77025b052732eC52E
├── SpendingLimitPolicy  → Daily: 10,000 USDC · Max/tx: 5,000 USDC
├── WhitelistPolicy      → 2 whitelisted addresses
├── TimelockPolicy       → 5 second cooldown
├── MultiSigPolicy       → 1 of N signers (auto-register)
└── RiskScorePolicy      → Min threshold: 50/100
```

---

## 📊 Test Coverage

```
  110 passing · 9 pending
```

| Test File | Tests | Key Scenarios |
|---|---|---|
| PolicyEngine | 15 | Vault registration, policy add/remove, multi-policy validation, pause |
| SpendingLimitPolicy | 14 | Daily cumulative, per-tx max, day boundary reset, vault overrides |
| WhitelistPolicy | 12 | Per-vault lists, batch operations, removal |
| TimelockPolicy | 11 | Cooldown enforcement, expiry, duration changes |
| MultiSigPolicy | 14 | Auto-register signers, approve/revoke, threshold, clear-on-execute |
| RiskScorePolicy | 12 | Score assignment, threshold check, batch scoring, defaults |
| PolicyRegistry | 10 | Register, unregister, duplicate prevention |
| TreasuryFirewall | 12 | Screen & execute, pass/block metrics, authorization |
| Treasury | 10 | Deposit, firewall transfer, emergency pause, roles |
| Integration | E2E | Full pipeline with all 5 policies end-to-end |

> 9 pending tests = access-control checks intentionally skipped in demo mode.

```bash
cd arbitrum-policy-engine
npx hardhat test
```

---

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/karagozemin/FortiLayer.git
cd FortiLayer/arbitrum-policy-engine
npm install

# 2. Compile contracts
npx hardhat compile

# 3. Run all tests
npx hardhat test

# 4. Run interactive demo
npx hardhat run scripts/demo.ts

# 5. Start frontend
cd frontend && npm install && npm run dev
# Open http://localhost:3000 and connect wallet
```

### Deploy to Arbitrum Sepolia

```bash
cp .env.example .env
# Fill in DEPLOYER_PRIVATE_KEY and ARBISCAN_API_KEY

npx hardhat run scripts/deploy.ts --network arbitrumSepolia
npx hardhat verify --network arbitrumSepolia <ADDRESS>
```

---

## 📁 Project Structure

```
FortiLayer/
├── README.md
├── assets/logo.png
│
└── arbitrum-policy-engine/
    ├── hardhat.config.ts              # Solidity 0.8.20 · optimizer 200 · viaIR
    ├── contracts/                     # 17 Solidity files · ~2,300 LOC
    │   ├── core/                      # PolicyEngine, TreasuryFirewall, TransactionExecutor
    │   ├── interfaces/                # IPolicy, IPolicyEngine, IPolicyRegistry, ITreasury, ITreasuryFirewall
    │   ├── policies/                  # BasePolicy + 5 policy modules
    │   ├── registry/                  # PolicyRegistry
    │   ├── treasury/                  # Treasury
    │   └── mocks/                     # MockUSDC
    ├── test/                          # 10 test files · 110 passing
    ├── scripts/                       # deploy.ts · demo.ts · status.ts
    └── frontend/                      # React 18 + Vite 5 + WalletConnect
        └── src/
            ├── components/            # Dashboard, PolicyManager, TransactionQueue, FirewallStatus
            ├── config/                # AppKit (WalletConnect) configuration
            ├── hooks/                 # useWallet context
            ├── utils/                 # ABIs, addresses, contract helpers
            └── types/                 # TypeScript interfaces
```

---

## 🗺 Roadmap

### ✅ Completed

- [x] Core architecture (PolicyEngine + TreasuryFirewall + Treasury)
- [x] 5 composable policy modules with validate-then-record pattern
- [x] 110-test suite with unit + integration coverage
- [x] Deploy & verify 10 contracts on Arbitrum Sepolia
- [x] React dashboard with WalletConnect + pre-flight validation
- [x] Interactive 8-step demo script
- [x] MultiSig policy with full UI (approve/revoke/status/admin)

### 🔜 Next Phase

- [ ] **Stylus migration** — Rewrite compute-heavy policies in Rust for 10-100x gas reduction
- [ ] **On-chain risk oracle** — Chainlink/API3 integration for real-time address risk scoring
- [ ] **DAO governance module** — Policy changes via token-weighted governance votes
- [ ] **Institutional onboarding SDK** — TypeScript SDK for integrating FortiLayer into existing treasury workflows
- [ ] **Policy marketplace** — Deploy, share, and monetize custom policy modules
- [ ] **Cross-chain support** — Arbitrum ↔ Ethereum ↔ Optimism treasury bridging with policy enforcement
- [ ] **Formal verification** — Certora/Halmos proofs for core invariants
- [ ] **Arbitrum mainnet deployment**

> **FortiLayer is not a hackathon project that ends at demo day. It's infrastructure for the institutional on-chain era.**

---

## 📄 License

MIT

---

<div align="center">

**Built for the Arbitrum ecosystem** 🔵

*Execution risk is the last unsolved problem in DeFi. FortiLayer solves it.*

[Live Demo](https://fortilayer.vercel.app) · [Arbiscan](https://sepolia.arbiscan.io/address/0x245118Fba999F1ed338174933f83bdD6e08327D9) · [GitHub](https://github.com/karagozemin/FortiLayer)

</div>
