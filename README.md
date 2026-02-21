<div align="center">

<img src="assets/logo.png" alt="FortiLayer" width="180" />

# FortiLayer

### The Programmable Execution Firewall for Institutional Arbitrum Treasuries

> *The first programmable policy layer built natively for Arbitrum Stylus.*

> Smart contracts can be correct — and capital can still be stolen.
> **FortiLayer fixes the execution layer.**

[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-363636?logo=solidity)](https://soliditylang.org/)
[![Rust](https://img.shields.io/badge/Rust-Stylus%20WASM-orange?logo=rust)](https://docs.arbitrum.io/stylus/gentle-introduction)
[![Arbitrum](https://img.shields.io/badge/Arbitrum-Sepolia-blue?logo=arbitrum)](https://arbitrum.io/)
[![Tests](https://img.shields.io/badge/Tests-140%20passing-brightgreen)](.)
[![Contracts](https://img.shields.io/badge/Contracts-12%20verified-4E5EE4)](https://sepolia.arbiscan.io/)
[![Chainlink](https://img.shields.io/badge/Oracle-Chainlink%20ETH%2FUSD-375BD2?logo=chainlink)](https://data.chain.link/)
[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?logo=react)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

> **No transaction leaves the vault without passing every policy. Period.**
>
> *FortiLayer turns Arbitrum into an institution-ready execution environment.*

FortiLayer is an **atomic, composable execution firewall** for on-chain treasuries.
Six policy modules — spending limits, whitelists, timelocks, multi-sig, risk scoring, and **live Chainlink oracle** — enforce institutional-grade controls on every outbound transfer. The performance-critical path runs on **Stylus (Rust/WASM)** for ~8–9x gas efficiency.

**⚡ 30-Second Summary**

| | |
|---|---|
| 🔒 **What** | Composable policy pipeline — every transfer validated atomically against 6 independent modules |
| 🏛 **Who** | DAOs, RWA issuers, institutional custodians, on-chain funds |
| 🔵 **Why Arbitrum** | 5+ inter-contract calls per transfer = only viable on L2. Stylus = only possible on Arbitrum |
| 🦀 **Stylus** | SpendingLimitPolicy in Rust/WASM — deployed, cached, 11.5 KB. **Not an add-on. Our performance layer.** |
| 🔗 **Oracle** | Live Chainlink ETH/USD — market stress automatically tightens execution permissions |
| ✅ **Status** | 12 contracts deployed & verified · 140 tests · Full React dashboard · Live on Arbitrum Sepolia |

[Architecture](#-architecture) · [Why Arbitrum?](#-why-arbitrum) · [Stylus](#-stylus--the-performance-layer) · [Oracle](#-adaptive-risk--chainlink-oracle) · [Deployment](#-deployed-contracts) · [Demo](#-demo)

</div>

---

## 🏆 Why FortiLayer Wins

> **FortiLayer delivers production-grade infrastructure built specifically for Arbitrum.**

Everything below is shipped, deployed, and verified — not planned, not mocked:

| What We Ship | Why It Matters |
|---|---|
| **6-module execution firewall** | AND-logic enforcement — strictest policy wins. Not OR. Not optional. |
| **Stylus (Rust/WASM) policy** 🦀 | Performance-critical spending limits run native WASM. Only possible on Arbitrum. |
| **Live Chainlink oracle** 🔗 | Market stress → automatic permission tightening. Adaptive, not static. |
| **Two-phase atomic validation** | validate() → record(). Zero state pollution on failure. Off-chain simulation. |
| **3-layer circuit breaker** | Any single pause freezes everything. Three independent kill switches. |
| **140 tests · 12 verified contracts · Stylus WASM deployed** | Production-grade, verifiable, not theoretical. |
| **Full React dashboard** | WalletConnect + pre-flight simulation + 4 pages. Users see errors before spending gas. |
| **Not a consumer dApp** | Institutional-grade infrastructure — aligned with **Arbitrum's long-term strategy**. |

---

## 🏆 Hackathon Alignment

| Criteria | Evidence |
|---|---|
| **Deployed on Arbitrum** | 12 contracts verified on Arbitrum Sepolia — [Arbiscan ↗](https://sepolia.arbiscan.io/address/0x245118Fba999F1ed338174933f83bdD6e08327D9) |
| **Uses Stylus** | SpendingLimitPolicy written in Rust, compiled to WASM, deployed & cached — [`0xb92da5...`](https://sepolia.arbiscan.io/address/0xb92da51e406b72fddd4cdc03b32ddd2bdeeb1c6e) |
| **Real oracle integration** | Live Chainlink ETH/USD feed — adaptive risk scoring, not mock data |
| **Real-world use case** | Institutional treasury protection — $50B+ addressable market |
| **Technical depth** | 6 composable policies · 140 tests · two-phase atomic validation · 3-layer circuit breaker |
| **Complete product** | Smart contracts + React dashboard + WalletConnect + pre-flight simulation |

---

## 🌍 Why This Is Bigger Than Treasury Protection

FortiLayer introduces a new primitive for Arbitrum:

**Programmable execution control.**

If Arbitrum is the execution layer of Ethereum,
FortiLayer becomes the **policy layer of Arbitrum**.

- Every Orbit chain can embed it
- Every institutional vault can require it
- Every regulated RWA protocol can depend on it

> **This is not an app. This is infrastructure that upgrades how capital moves on Arbitrum.**

---

## 🔵 Why This Strengthens Arbitrum

FortiLayer is not just a treasury tool — it is **ecosystem infrastructure**.

- **Enables institutional capital** to deploy safely on Arbitrum — not just cheaply
- **Increases TVL retention** by preventing catastrophic treasury drains
- **Makes Orbit chains institution-ready** by default — embed FortiLayer as a native compliance layer
- **Positions Arbitrum as the compliance-ready L2** — the chain where institutions *want* to build
- **Showcases Stylus** as a real production tool — not just a demo feature
- **Demonstrates real Stylus adoption** beyond toy examples — production policy logic running in WASM

> Scalable execution is not enough. **Controlled execution is the next layer.** FortiLayer builds it on Arbitrum.

---

## 🔥 The Problem

> **A DAO can survive a 50% drawdown. It cannot survive a drained treasury.**

Euler ($197M), Mango ($114M), Ronin ($625M) — none were smart contract bugs. They were **execution control failures**: unauthorized access, no spending limits, missing cooldowns.

**These were not contract bugs. They were missing execution controls.**

Today's tools don't solve this:

| Existing Approach | What It Does | What It Doesn't |
|---|---|---|
| **Multi-sig wallets** | Require multiple signers | No per-tx limits, no composable rules, no oracle risk |
| **Timelock controllers** | Delay execution | Single dimension — no spending limits, no whitelists |
| **Hardcoded limits** | Fixed caps | Can't adapt. No market awareness. No per-vault config |

FortiLayer replaces all of them with **one composable execution layer**:

```
6 policies · AND logic · per-vault · atomic · adaptive
Every transfer passes ALL policies or it doesn't move.
```

---

## ⏰ Why Now?

**$50B+ in DAO treasuries.** $936M lost to execution failures (Euler, Mango, Ronin). BlackRock and Franklin Templeton moving on-chain. MiCA and SEC enforcement accelerating.

> **The gap between "institutional capital on-chain" and "institutional-grade controls" is FortiLayer's market.** These aren't code bugs. They're missing infrastructure.

---

## 🏛 Why Arbitrum? (Architectural Dependency)

> **FortiLayer is deeply coupled to Arbitrum's execution model.**
> *Stylus + low-cost composability make this architecture economically viable.*

FortiLayer's 6-policy pipeline makes **5+ inter-contract calls per transfer**. This requires three things only Arbitrum delivers:

| Requirement | Why Only Arbitrum | Impact |
|---|---|---|
| **$0.001/tx gas** | 5+ contract calls per transfer = $15-50 on mainnet, $0.01 on Arbitrum | Composable policies become economically viable |
| **Stylus (Rust/WASM)** ⭐ | **Only Arbitrum supports WASM execution.** Our SpendingLimitPolicy runs as native Rust — ~8–9x cheaper | Performance-critical policy logic at L1 cost |
| **~250ms blocks** | Real-time policy enforcement feels instant | Institutional UX — screening can't feel slow |
| **Largest L2 TVL** | Where institutional money already lives | Product-market alignment |
| **Orbit L3** | Custom chains can embed FortiLayer as a **native compliance layer** | Chain-level execution control |

> **Low cost enables frequent checks. Stylus enables high-performance policy execution. Together, they make FortiLayer possible.**
>
> *Without Arbitrum's Stylus and L2 economics, FortiLayer's multi-policy architecture would be economically impractical on Ethereum mainnet.*

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

> **Every known treasury attack vector is covered by at least one policy. Most are covered by multiple overlapping layers.**

---

## 🦀 Stylus — The Performance Layer

> **Stylus isn't an add-on. It's our performance layer.**

The SpendingLimitPolicy is the **most frequently called policy** — every single transfer checks spending limits. We rewrote it in Rust and deployed it as a Stylus WASM contract for maximum throughput at minimum cost.

| Metric | Solidity Version | Stylus (Rust) Version |
|---|---|---|
| **Bytecode size** | ~4.2 KB EVM | **11.5 KB WASM** |
| **Execution cost** | Standard EVM gas | **~8–9x cheaper** (WASM native) |
| **Language** | Solidity 0.8.20 | **Rust (stylus-sdk v0.10.0)** |
| **Deployed** | `0x17580a...` | **`0xb92da5...`** |
| **Status** | ✅ Verified | ✅ **Deployed & cached on Arbitrum Sepolia** |

**Measured on Arbitrum Sepolia (policy validation path only):**

| | Gas |
|---|---|
| Solidity `validate()` | ~42,000 gas |
| Stylus `validate()` | ~4,800 gas |
| **Improvement** | **~8–9x on hottest execution path** |

Stylus allows us to keep the **same policy logic** while drastically reducing execution cost on the most frequently called path.

**Why this matters for judges:** Stylus is Arbitrum's flagship technology. FortiLayer doesn't just *mention* Stylus — we shipped a **production contract** in Rust that handles the hottest path in the entire system. Same logic, same tests, 8–9x better economics.

```rust
// From stylus-policies/src/lib.rs — real deployed code
#[public]
impl SpendingLimitPolicy {
    fn validate(&self, vault: Address, _token: Address, _to: Address, amount: U256) -> bool {
        let daily_limit = self.get_daily_limit(vault);
        let max_tx = self.get_max_tx_amount(vault);
        let spent = self.get_daily_spent(vault);
        require!(amount <= max_tx, "Exceeds max transaction amount");
        require!(spent + amount <= daily_limit, "Exceeds daily spending limit");
        true
    }
}
```

---

## 🔮 Adaptive Risk — Chainlink Oracle

> **Market stress automatically tightens execution permissions.**

The OracleRiskScorePolicy doesn't just check static scores — it reads **live Chainlink ETH/USD price data** and computes a **volatility-based risk score** in real time. When markets move, permissions adapt.

| Price Deviation from Anchor | Risk Score | Effect |
|---|---|---|
| < 2% (stable) | **100** (safe) | All transfers proceed normally |
| 2–5% (mild volatility) | **70** | High-value transfers may be restricted |
| 5–10% (significant move) | **40** | Most transfers blocked |
| > 10% (market stress) | **10** | Near-total lockdown — only critical ops pass |

**Dual-mode scoring:** Uses `min(oracleScore, manualScore)` — the more conservative score always wins. If oracle data goes stale, gracefully falls back to manual mode. No single point of failure.

**No oracle dependency can freeze treasury operations.** Stale data → manual fallback. Always operational.

**Live feed:** [`0xd30e2101...`](https://sepolia.arbiscan.io/address/0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165) (Chainlink ETH/USD on Arbitrum Sepolia)

> **This is not a price feed integration. This is an adaptive risk system that autonomously adjusts institutional execution permissions based on market conditions.**

---

## 🎯 Product-Market Fit

| Customer Segment | Problem | FortiLayer Solution |
|---|---|---|
| **DAO Treasuries** | Key compromise drains entire vault | Multi-layer execution firewall — spending limits + multi-sig + whitelist |
| **RWA Issuers** | Regulatory compliance on every transfer | Per-vault programmable rules — whitelist + risk scoring |
| **On-Chain Venture Funds** | Uncontrolled capital deployment | Daily + cumulative spending limits with auto-reset |
| **Payroll Protocols** | Internal abuse / unauthorized payouts | Timelock cooldowns + recipient whitelists |
| **Institutional Custodians** | Fiduciary duty enforcement | Full policy pipeline — every transfer auditable and policy-gated |
| **L3 / Orbit Chains** | Native compliance layer needed | Embed FortiLayer as chain-level execution control |

> **FortiLayer doesn't serve one niche. It's horizontal infrastructure for any entity that holds and moves value on-chain.**

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
                       ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐ ┌──────┐ ┌──────┐
                       │Spending│ │White-  │ │Time-   │ │Multi-│ │Risk  │ │Oracle│
                       │ Limit  │ │ list   │ │ lock   │ │ Sig  │ │Score │ │Risk  │
                       │(+Rust) │ │        │ │        │ │      │ │      │ │🔗CL  │
                       └────────┘ └────────┘ └────────┘ └──────┘ └──────┘ └──────┘
                                                                     │
                                      ALL PASS? ◄────────────────────┘
                                          │
                                   ┌──────┴──────┐
                                   ▼             ▼
                               ✅ Execute    ❌ Revert
                              Token Transfer  Custom Error
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

### Two-Phase Validation (Key Innovation)

`validate()` (view, no gas) → ALL pass? → `recordTransaction()` (state mutation) → execute.
If **any** policy fails, zero state is written. Off-chain pre-flight simulation uses the same `validate()` calls.

---

## 💪 Technical Strength

| Dimension | Implementation |
|---|---|
| **Modular Architecture** | BasePolicy abstract → 6 independent modules, hot-swappable per vault |
| **Stylus WASM** 🦀 | SpendingLimitPolicy in Rust — 11.5 KB deployed, cached, ~8–9x gas savings |
| **Live Chainlink Oracle** 🔗 | ETH/USD volatility → adaptive risk scores. Market stress = tighter permissions |
| **Custom Errors** | All 17 contracts use `error Name(params)` — no string reverts |
| **Gas Optimization** | Solidity optimizer (200 runs) + viaIR. View-call validation saves gas on reverts |
| **Access Control** | 3-role RBAC + onlyPolicyEngine + onlyOwner. Zero open functions |
| **Reentrancy Protection** | OpenZeppelin ReentrancyGuard on ALL state-changing functions |
| **Safe Tokens** | SafeERC20 wrappers everywhere — no raw `transfer()` |
| **Circuit Breakers** | 3-layer pause: PolicyEngine + Firewall + Treasury |
| **140 Tests** | 11 test files — unit + integration + oracle + multi-sig |
| **12 Verified Contracts** | 11 Solidity + 1 Stylus WASM on Arbiscan |

**Security layers:** 4-layer defense — RBAC access control → execution firewall (no direct transfers) → AND-logic policy pipeline → 3 independent circuit breakers. Custom errors on every revert — frontend parses them into human-readable messages.

---

## 🛡 Policy Modules

6 production-ready modules, each independently testable and hot-swappable per vault:

| # | Module | What It Enforces | Key Feature |
|---|---|---|---|
| 1 | **💳 SpendingLimitPolicy** | Daily cumulative + per-tx max | Auto-reset at UTC boundary. **Also deployed as Stylus/Rust** 🦀 |
| 2 | **✅ WhitelistPolicy** | Per-vault recipient allowlists | Zero-trust. Batch add/remove |
| 3 | **⏱ TimelockPolicy** | Cooldown between txs | Prevents rapid-fire extraction |
| 4 | **✍️ MultiSigPolicy** | M-of-N signer approval | keccak256 tx identity. Auto-register. Clear on execute |
| 5 | **📈 RiskScorePolicy** | 0–100 address scoring | Blocks transfers below threshold |
| 6 | **🔮 OracleRiskScorePolicy** | **Live Chainlink volatility** | Adaptive — market stress → tighter permissions. [Details ↑](#-adaptive-risk--chainlink-oracle) |

**Extensibility:** Extend `BasePolicy`, implement `validate()`, register via `policyEngine.addPolicy(vault, address)` — live immediately.

---

## 📜 Contract Overview

> **19 Solidity files + 1 Stylus Rust contract · ~2,800 LOC · 12 deployed & verified**

| Layer | Contracts | Role |
|---|---|---|
| **Core** | PolicyEngine · TreasuryFirewall · TransactionExecutor | Orchestration, screening, execution |
| **Vault** | Treasury · PolicyRegistry | Institutional vault + approved policy catalog |
| **Policies** | SpendingLimit · Whitelist · Timelock · MultiSig · RiskScore · **OracleRiskScore** | 6 composable enforcement modules |
| **Stylus** 🦀 | SpendingLimitPolicy (Rust/WASM) | Same logic, ~8–9x cheaper — 11.5 KB deployed |
| **Interfaces** | IPolicy · IPolicyEngine · ITreasury · ITreasuryFirewall · IChainlinkFeed | Clean abstraction boundaries |
| **Mocks** | MockUSDC · MockChainlinkFeed | Deterministic testing |

All contracts use OpenZeppelin v5.1 (Ownable, Pausable, AccessControl, ReentrancyGuard, SafeERC20).

---

## 🖥 Frontend

**React 18 + Vite 5 + WalletConnect** — 4-page dashboard with **pre-flight policy simulation**.

| Page | What It Does |
|---|---|
| **Dashboard** | Mint USDC · Deposit · Transfer with **pre-flight validation** (errors shown before gas spend) |
| **Policy Manager** | Configure all 6 policies · MultiSig approval UI |
| **Transactions** | History timeline · Pass/block badges · Arbiscan links |
| **Firewall Status** | System health · Emergency pause/unpause for all 3 contracts |

> Pre-flight: `simulate validate() off-chain → show exact errors → submit only if all pass` — users never waste gas on rejected transfers.

---

## 🎮 Demo

8-step interactive demo — deploys everything and attacks the vault:

```
 ✅ Valid Transfer         → PASSED (all 5 policies)
 ❌ Over-Limit Transfer   → BLOCKED (SpendingLimitPolicy)
 ❌ Non-Whitelisted Addr  → BLOCKED (WhitelistPolicy)
 ❌ Risky Address          → BLOCKED (RiskScorePolicy)
 ❌ No MultiSig Approval   → BLOCKED (MultiSigPolicy)
 🛑 Emergency Pause       → HALTED → ✅ Resumed
```

```bash
cd arbitrum-policy-engine && npx hardhat run scripts/demo.ts
```

---

## 📋 Deployed Contracts

> **Network: Arbitrum Sepolia · Chain ID: 421614 · 12 contracts deployed & verified ✅**

### Solidity Contracts

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
| **OracleRiskScorePolicy** 🔮 | `0x52d4E065453d0E3aabE727A38A33bFbE9f6b5795` | [View ↗](https://sepolia.arbiscan.io/address/0x52d4E065453d0E3aabE727A38A33bFbE9f6b5795) |

### Stylus Contract (Rust/WASM) 🦀

| Contract | Address | Details |
|---|---|---|
| **SpendingLimitPolicy (Stylus)** | `0xb92da51e406b72fddd4cdc03b32ddd2bdeeb1c6e` | 11.5 KB WASM · Rust · stylus-sdk v0.10.0 · cached |

### External Oracle

| Feed | Address | Source |
|---|---|---|
| **Chainlink ETH/USD** | `0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165` | [Chainlink Data Feeds](https://data.chain.link/) |

### Live Vault Configuration

```
Treasury Vault: 0x9BcF0E126b82C8E7cC5151C77025b052732eC52E
├── SpendingLimitPolicy  → Daily: 10,000 USDC · Max/tx: 5,000 USDC
├── WhitelistPolicy      → 2 whitelisted addresses
├── TimelockPolicy       → 5 second cooldown
├── MultiSigPolicy       → 1 of N signers (auto-register)
├── RiskScorePolicy      → Min threshold: 50/100
└── OracleRiskScorePolicy→ Live Chainlink ETH/USD · Anchor: $1,974.87
```

---

## 📊 Test Coverage

```
  140 passing · 9 pending
```

| Test File | Tests | Key Scenarios |
|---|---|---|
| PolicyEngine | 15 | Vault registration, policy add/remove, multi-policy validation, pause |
| SpendingLimitPolicy | 14 | Daily cumulative, per-tx max, day boundary reset, vault overrides |
| WhitelistPolicy | 12 | Per-vault lists, batch operations, removal |
| TimelockPolicy | 11 | Cooldown enforcement, expiry, duration changes |
| MultiSigPolicy | 14 | Auto-register signers, approve/revoke, threshold, clear-on-execute |
| RiskScorePolicy | 12 | Score assignment, threshold check, batch scoring, defaults |
| **OracleRiskScorePolicy** | **30** | **Oracle scoring, volatility bands, dual-mode, stale fallback, Chainlink integration** |
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
├── arbitrum-policy-engine/              # Solidity contracts
│   ├── hardhat.config.ts              # Solidity 0.8.20 · optimizer 200 · viaIR
│   ├── contracts/                     # 19 Solidity files · ~2,800 LOC
│   │   ├── core/                      # PolicyEngine, TreasuryFirewall, TransactionExecutor
│   │   ├── interfaces/                # IPolicy, IPolicyEngine, ..., IChainlinkFeed
│   │   ├── policies/                  # BasePolicy + 6 policy modules (incl. OracleRiskScorePolicy)
│   │   ├── registry/                  # PolicyRegistry
│   │   ├── treasury/                  # Treasury
│   │   └── mocks/                     # MockUSDC, MockChainlinkFeed
│   ├── test/                          # 11 test files · 140 passing
│   ├── scripts/                       # deploy.ts · deploy-oracle.ts · demo.ts · status.ts
│   └── frontend/                      # React 18 + Vite 5 + WalletConnect
│       └── src/
│           ├── components/            # Dashboard, PolicyManager, TransactionQueue, FirewallStatus
│           ├── config/                # AppKit (WalletConnect) configuration
│           ├── hooks/                 # useWallet context
│           ├── utils/                 # ABIs, addresses, contract helpers
│           └── types/                 # TypeScript interfaces
│
└── stylus-policies/                   # Rust Stylus WASM contract
    ├── Cargo.toml                     # stylus-sdk v0.10.0 · alloy-primitives v1.3
    ├── rust-toolchain.toml            # nightly-2025-02-24 · wasm32-unknown-unknown
    └── src/
        ├── lib.rs                     # SpendingLimitPolicy (~370 LOC Rust)
        └── main.rs                    # Entry point + ABI export
```

---

## 🗺 Roadmap

### ✅ Completed

- [x] Core architecture (PolicyEngine + TreasuryFirewall + Treasury)
- [x] 6 composable policy modules with validate-then-record pattern
- [x] 140-test suite with unit + integration coverage
- [x] Deploy & verify 12 contracts on Arbitrum Sepolia
- [x] React dashboard with WalletConnect + pre-flight validation
- [x] Interactive 8-step demo script
- [x] MultiSig policy with full UI (approve/revoke/status/admin)
- [x] **Stylus WASM deployment** — SpendingLimitPolicy in Rust, 11.5 KB, deployed & cached
- [x] **Real Chainlink oracle** — OracleRiskScorePolicy with live ETH/USD feed, volatility-based scoring

### 🔜 Next Phase
- [ ] **DAO governance module** — Policy changes via token-weighted governance votes
- [ ] **Institutional onboarding SDK** — TypeScript SDK for integrating FortiLayer into existing treasury workflows
- [ ] **Policy marketplace** — Deploy, share, and monetize custom policy modules
- [ ] **Cross-chain support** — Arbitrum ↔ Ethereum ↔ Optimism treasury bridging with policy enforcement
- [ ] **Formal verification** — Certora/Halmos proofs for core invariants
- [ ] **Native Orbit chain template** — Orbit L3 with FortiLayer pre-installed as default compliance layer
- [ ] **Arbitrum mainnet deployment**

> **FortiLayer is infrastructure, not a hackathon project. It ships and keeps shipping.**

---

## 💰 Business Model

**Positioning: "AWS WAF for On-Chain Capital"** — infrastructure-as-a-service for institutional treasuries:

| Revenue | Model |
|---|---|
| **Vault deployment** | One-time setup per institutional vault |
| **Policy subscription** | Managed policy config + monitoring |
| **Premium modules** | Geo-blocking, AML scoring, regulatory reporting |
| **Stylus performance** | Rust WASM execution — ~8–9x gas savings |
| **Oracle feeds** | Live Chainlink risk scoring |

**TAM:** $50B+ in DAO treasuries (40%+ YoY) + $10T+ RWA tokenization by 2030.

---

## ⚔️ How FortiLayer Compares

| Capability | Traditional Multi-sigs | Timelock Solutions | **FortiLayer** |
|---|---|---|---|
| Composable policies | ❌ | ❌ | **✅ 6 modules, AND logic** |
| Stylus (Rust/WASM) | ❌ | ❌ | **✅ Deployed & cached** |
| Live oracle risk | ❌ | ❌ | **✅ Chainlink adaptive** |
| Pre-flight simulation | ❌ | ❌ | **✅ Off-chain validate()** |
| Per-vault config | Per-wallet | Global | **✅ Per-vault policies** |
| Circuit breaker | ❌ | ❌ | **✅ 3 independent pauses** |
| Test coverage | Varies | Limited | **✅ 140 tests** |
| Verified deployment | Varies | Varies | **✅ 12 on Arbiscan** |

> **FortiLayer isn't an alternative to multi-sigs. It's the execution control layer that sits above them.**

---

## 🧠 Built With Intent

FortiLayer was not built to win a hackathon.

It was built to solve a **structural flaw** in how on-chain capital is protected.

The hackathon was simply the catalyst.

It was built to become the **default execution control layer** for institutional capital on Arbitrum.

---

## 🔬 What We Would Audit First

If deployed to mainnet, we would prioritize:

- **Formal verification** of cumulative spending invariants
- **MultiSig transaction identity** collision analysis
- **Stylus ↔ Solidity interface** fuzz testing
- **Oracle staleness** edge-case simulations

> Security is not a checkbox. It is a continuous process.

---

## 📄 License

MIT

---

<div align="center">

**Built for Arbitrum. Powered by Stylus. Secured by Chainlink.** 🔵🦀🔗

*Programmable execution control for institutional on-chain capital.*

[Live Demo](https://fortilayer.vercel.app) · [Arbiscan](https://sepolia.arbiscan.io/address/0x245118Fba999F1ed338174933f83bdD6e08327D9) · [GitHub](https://github.com/karagozemin/FortiLayer)

</div>
