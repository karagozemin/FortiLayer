# FortiLayer — Architecture Document

> **Technical deep-dive into FortiLayer's execution firewall architecture.**
> For a high-level overview, see [README.md](README.md).

---

## Table of Contents

- [System Overview](#system-overview)
- [Transaction Flow](#transaction-flow)
- [Two-Phase Validation](#two-phase-validation)
- [Contract Dependency Graph](#contract-dependency-graph)
- [Core Contracts](#core-contracts)
  - [PolicyEngine](#policyengine)
  - [TreasuryFirewall](#treasuryfirewall)
  - [TransactionExecutor](#transactionexecutor)
  - [Treasury](#treasury)
- [Policy Layer](#policy-layer)
  - [BasePolicy (Abstract)](#basepolicy-abstract)
  - [SpendingLimitPolicy](#spendinglimitpolicy)
  - [WhitelistPolicy](#whitelistpolicy)
  - [TimelockPolicy](#timelockpolicy)
  - [MultiSigPolicy](#multisigpolicy)
  - [RiskScorePolicy](#riskscorepolicy)
  - [OracleRiskScorePolicy](#oracleriskscorpolicy)
- [Registry](#registry)
- [Stylus WASM Layer](#stylus-wasm-layer)
- [Security Model](#security-model)
- [Gas Optimization](#gas-optimization)
- [Interface Specifications](#interface-specifications)
- [Deployment Topology](#deployment-topology)

---

## System Overview

FortiLayer is a **multi-contract execution firewall** that sits between an institutional treasury vault and the ERC-20 token transfer layer. Every outbound transfer must pass through a configurable pipeline of independent policy modules before execution.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FORTILAYER SYSTEM                            │
│                                                                     │
│  ┌───────────┐    ┌──────────────────┐    ┌────────────────────┐   │
│  │  Treasury  │───▶│ TreasuryFirewall │───▶│   PolicyEngine     │   │
│  │   (Vault)  │    │   (Gateway)      │    │  (Orchestrator)    │   │
│  └───────────┘    └──────────────────┘    └────────┬───────────┘   │
│                                                     │               │
│                          ┌──────────────────────────┤               │
│                          ▼                          ▼               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    POLICY PIPELINE                           │   │
│  │                                                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │ Spending │ │ Whitelist│ │ Timelock │ │ MultiSig │       │   │
│  │  │  Limit   │ │          │ │          │ │          │       │   │
│  │  │(+Stylus) │ │          │ │          │ │          │       │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  │  ┌──────────┐ ┌──────────┐                                  │   │
│  │  │  Risk    │ │  Oracle  │                                  │   │
│  │  │  Score   │ │Risk(CL)  │                                  │   │
│  │  └──────────┘ └──────────┘                                  │   │
│  │                                                              │   │
│  │              ALL must pass (AND logic)                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────┐   ┌──────────────────┐                         │
│  │PolicyRegistry  │   │ TransactionExec  │                         │
│  │(Approved list) │   │   (RBAC exec)    │                         │
│  └────────────────┘   └──────────────────┘                         │
│                                                                     │
│  External: Chainlink ETH/USD Price Feed                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **AND-logic enforcement** — Every attached policy must pass. Strictest policy wins.
2. **Two-phase validation** — `validate()` (view) → `recordTransaction()` (state). Zero state pollution on failure.
3. **Per-vault configuration** — Each vault has its own policy set and configuration.
4. **Hot-swappable policies** — Add/remove policies without redeploying the vault.
5. **No direct token access** — Tokens are held by Treasury; only the firewall can move them.

---

## Transaction Flow

### Complete 6-Step Lifecycle

```
  ① REQUEST    ② SCREEN      ③ VALIDATE    ④ RECORD      ⑤ EXECUTE     ⑥ CONFIRM
     │            │              │             │              │              │
     ▼            ▼              ▼             ▼              ▼              ▼
  Treasury    Firewall      PolicyEngine   Policies      Firewall       Frontend
  approve()   ++screened    for-each       state write   safeTransfer   receipt
  firewall    check auth    validate()     only if       ERC-20         toast
              call engine   (view calls)   ALL pass      transfer       Arbiscan
```

### Detailed Call Sequence

```
User
 │
 ├─① Treasury.requestTransfer(token, to, amount)
 │   ├── Check: whenNotPaused
 │   ├── Check: nonReentrant
 │   ├── Check: balance >= amount
 │   ├── IERC20.approve(firewall, amount)
 │   └── Call: firewall.screenAndExecute(vault, token, to, amount)
 │
 ├─② TreasuryFirewall.screenAndExecute(vault, token, to, amount)
 │   ├── Check: whenNotPaused
 │   ├── Check: nonReentrant
 │   ├── Check: onlyAuthorizedVault
 │   ├── totalScreened++
 │   ├── Call: policyEngine.validateTransaction(vault, token, to, amount)
 │   │
 │   ├─③ PolicyEngine.validateTransaction(vault, token, to, amount)
 │   │   ├── Check: whenNotPaused, nonReentrant, vaultExists
 │   │   │
 │   │   ├── PHASE 1: VALIDATE (view calls — no state change)
 │   │   │   ├── for each policy in vault.policies:
 │   │   │   │   └── IPolicy(policy).validate(vault, token, to, amount)
 │   │   │   │       ├── ✅ pass → continue
 │   │   │   │       └── ❌ revert → TransactionNotCompliant
 │   │   │   │
 │   │   ├── PHASE 2: RECORD (state mutation — only if ALL validated)
 │   │   │   ├── for each policy in vault.policies:
 │   │   │   │   └── IPolicy(policy).recordTransaction(vault, token, to, amount)
 │   │   │   │
 │   │   │   └── totalTransactionsValidated++
 │   │   │       emit TransactionValidated(vault, token, to, amount)
 │   │   │
 │   │   └── return (success)
 │   │
 │   ├── totalPassed++
 │   ├── IERC20.safeTransferFrom(vault, to, amount)  ─⑤
 │   └── emit TransactionScreened(vault, token, to, amount, true)
 │
 └─⑥ Frontend: await tx.wait() → success toast + Arbiscan link
```

### Failure Path

```
User
 │
 ├─① Treasury.requestTransfer(token, to, amount)
 │   └── firewall.screenAndExecute(...)
 │       └── policyEngine.validateTransaction(...)
 │           └── PHASE 1: Policy[i].validate() → REVERT
 │               └── error TransactionNotCompliant(policy, reason)
 │                   └── Firewall catches → totalBlocked++
 │                       └── emit TransactionScreened(..., false)
 │                           └── Treasury tx reverts
 │                               └── Frontend: parse error → show reason
 │
 │   ⚠ ZERO state written in any policy
 │   ⚠ No tokens moved
 │   ⚠ User sees exact rejection reason
```

---

## Two-Phase Validation

This is FortiLayer's **key architectural innovation**.

### Problem it Solves

If validation and state recording happen in a single call, a failure in policy[3] would leave stale state written by policy[1] and policy[2]. This creates **state pollution** — cumulative spending trackers, cooldown timers, and multi-sig approvals would be corrupted.

### Solution

```
Phase 1: validate()        — All policies checked as VIEW calls (no state)
                             If ANY reverts → entire tx reverts cleanly

Phase 2: recordTransaction() — Only runs if ALL policies pass
                             State is written atomically
```

### Benefits

| Benefit | Explanation |
|---|---|
| **Zero state pollution** | Failed tx writes nothing to any policy |
| **Off-chain simulation** | Same `validate()` calls work as pre-flight check from frontend |
| **Gas savings on failure** | View calls don't consume gas on revert path |
| **Atomic compliance** | Either ALL policies agree, or nothing happens |

---

## Contract Dependency Graph

```
                    ┌──────────────────┐
                    │    Treasury      │
                    │ (AccessControl)  │
                    │ (Pausable)       │
                    │ (ReentrancyGuard)│
                    └────────┬─────────┘
                             │ calls
                             ▼
                    ┌──────────────────┐
                    │TreasuryFirewall  │
                    │ (Ownable)        │
                    │ (Pausable)       │       ┌──────────────────┐
                    │ (ReentrancyGuard)│──────▶│TransactionExecutor│
                    └────────┬─────────┘       │ (AccessControl)  │
                             │ calls           │ (ReentrancyGuard)│
                             ▼                 └──────────────────┘
                    ┌──────────────────┐
                    │  PolicyEngine    │
                    │ (Ownable)        │
                    │ (Pausable)       │
                    │ (ReentrancyGuard)│
                    └────────┬─────────┘
                             │ iterates
                             ▼
              ┌──────────────────────────┐
              │     IPolicy Interface    │
              │  validate() + record()   │
              └──────────┬───────────────┘
                         │ implements
         ┌───────────────┼───────────────────────┐
         ▼               ▼                       ▼
   ┌───────────┐  ┌───────────┐           ┌───────────┐
   │BasePolicy │  │BasePolicy │    ...    │BasePolicy │
   │  ├─ Spend │  │  ├─ White │           │  ├─Oracle │
   │  │  Limit │  │  │  list  │           │  │  Risk  │
   └───────────┘  └───────────┘           └─────┬─────┘
                                                 │ reads
                                                 ▼
                                          ┌───────────┐
                                          │ Chainlink │
                                          │ ETH/USD   │
                                          │ Price Feed│
                                          └───────────┘

   ┌───────────────┐
   │PolicyRegistry │ (approved policy catalog — independent)
   │ (Ownable)     │
   └───────────────┘
```

---

## Core Contracts

### PolicyEngine

**File:** `contracts/core/PolicyEngine.sol`
**Inheritance:** `IPolicyEngine → Ownable → Pausable → ReentrancyGuard`
**Role:** Central orchestrator — manages vault registrations and policy execution pipeline.

#### Storage

| Variable | Type | Purpose |
|---|---|---|
| `_vaults` | `mapping(address ⇒ VaultConfig)` | Vault configurations |
| `totalVaults` | `uint256` | Counter |
| `totalTransactionsValidated` | `uint256` | Counter |

#### VaultConfig Struct

```solidity
struct VaultConfig {
    address owner;
    address[] policies;
    mapping(address => bool) isPolicyActive;
    bool registered;
}
```

#### Key Functions

| Function | Modifiers | Description |
|---|---|---|
| `registerVault(vault)` | `whenNotPaused` | Registers a new vault with msg.sender as owner |
| `addPolicy(vault, policy)` | `whenNotPaused`, `vaultExists` | Attaches a policy to a vault's pipeline |
| `removePolicy(vault, policy)` | `whenNotPaused`, `vaultExists` | Detaches policy (swap-and-pop removal) |
| `validateTransaction(vault, token, to, amount)` | `whenNotPaused`, `nonReentrant`, `vaultExists` | **Core** — Phase 1: validate all → Phase 2: record all |
| `pause()` / `unpause()` | `onlyOwner` | Emergency circuit breaker |

#### Events

- `VaultRegistered(vault, owner)`
- `PolicyAdded(vault, policy)`
- `PolicyRemoved(vault, policy)`
- `TransactionValidated(vault, token, to, amount)`
- `TransactionRejected(vault, token, to, amount, reason)`

#### Errors

- `VaultNotRegistered(vault)`
- `VaultAlreadyRegistered(vault)`
- `PolicyAlreadyRegistered(vault, policy)`
- `PolicyNotRegistered(vault, policy)`
- `TransactionNotCompliant(policy, reason)`

---

### TreasuryFirewall

**File:** `contracts/core/TreasuryFirewall.sol`
**Inheritance:** `ITreasuryFirewall → Ownable → Pausable → ReentrancyGuard`
**Role:** Gateway between vault and policy engine. Screens transfers and executes token movements.

#### Storage

| Variable | Type | Purpose |
|---|---|---|
| `policyEngine` | `IPolicyEngine` | Reference to orchestrator |
| `_authorizedVaults` | `mapping(address ⇒ bool)` | Vault whitelist |
| `totalScreened` | `uint256` | All attempted transfers |
| `totalPassed` | `uint256` | Transfers that passed all policies |
| `totalBlocked` | `uint256` | Transfers rejected by policy |

#### Key Functions

| Function | Modifiers | Description |
|---|---|---|
| `screenAndExecute(vault, token, to, amount)` | `whenNotPaused`, `nonReentrant`, `onlyAuthorizedVault` | Validates via engine → executes `safeTransferFrom` |
| `authorizeVault(vault)` | `onlyOwner` | Whitelists a vault |
| `revokeVault(vault)` | `onlyOwner` | Removes vault authorization |
| `pause()` / `unpause()` | `onlyOwner` | Emergency circuit breaker |

#### Metrics

The firewall tracks pass/block metrics on-chain:
- `totalScreened` = `totalPassed` + `totalBlocked`
- These are queryable from the frontend for the Firewall Status dashboard.

---

### TransactionExecutor

**File:** `contracts/core/TransactionExecutor.sol`
**Inheritance:** `AccessControl → ReentrancyGuard`
**Role:** RBAC-gated token transfer executor. Generates unique transaction IDs.

#### Storage

| Variable | Type | Purpose |
|---|---|---|
| `EXECUTOR_ROLE` | `bytes32` | `keccak256("EXECUTOR_ROLE")` |
| `_nonce` | `uint256` | Sequential tx counter |
| `totalExecuted` | `uint256` | Counter |

#### Key Functions

| Function | Modifiers | Description |
|---|---|---|
| `execute(token, to, amount)` | `onlyRole(EXECUTOR_ROLE)`, `nonReentrant` | Executes `safeTransferFrom`, returns `txId = keccak256(nonce, token, to, amount, sender, timestamp)` |

---

### Treasury

**File:** `contracts/treasury/Treasury.sol`
**Inheritance:** `ITreasury → AccessControl → Pausable → ReentrancyGuard`
**Role:** Institutional vault. Holds ERC-20 tokens. Initiates transfers through the firewall.

#### Roles (RBAC)

| Role | Purpose |
|---|---|
| `ADMIN_ROLE` | Contract configuration |
| `EXECUTOR_ROLE` | Can initiate transfers |
| `PAUSER_ROLE` | Emergency pause/unpause |

#### Key Functions

| Function | Modifiers | Description |
|---|---|---|
| `deposit(token, amount)` | `whenNotPaused` | Accepts ERC-20 deposits into vault |
| `requestTransfer(token, to, amount)` | `whenNotPaused`, `nonReentrant` | Checks balance → approves firewall → calls `screenAndExecute` |
| `emergencyPause()` | `onlyRole(PAUSER_ROLE)` | Emergency circuit breaker |
| `emergencyWithdraw(token, to, amount)` | `onlyRole(ADMIN_ROLE)`, `whenPaused` | Rescue stuck tokens (only when paused) |

#### Token Flow

```
Depositor ──ERC20.transfer──▶ Treasury (holds tokens)
                                  │
                                  ├── approve(firewall, amount)
                                  │
                                  └── firewall.screenAndExecute()
                                         │
                                         └── safeTransferFrom(treasury → recipient)
```

> **Critical:** The Treasury never transfers tokens directly. All outbound transfers go through the firewall → policy engine pipeline.

---

## Policy Layer

### BasePolicy (Abstract)

**File:** `contracts/policies/BasePolicy.sol`
**Role:** Abstract base for all policy modules. Provides engine authorization guard.

```solidity
abstract contract BasePolicy is IPolicy {
    address public policyEngineAddress;
    address public owner;

    modifier onlyPolicyEngine() {
        if (msg.sender != policyEngineAddress) revert OnlyPolicyEngine();
        _;
    }

    // Default no-op — override in stateful policies
    function recordTransaction(...) external virtual onlyPolicyEngine { }
}
```

All 6 policy modules extend `BasePolicy`.

---

### SpendingLimitPolicy

**File:** `contracts/policies/SpendingLimitPolicy.sol`
**Type:** Stateful (records cumulative daily spending)

#### Logic

```
validate():
  ├── Check: amount <= maxTxAmount (per-tx limit)
  └── Check: dailySpent + amount <= dailyLimit (cumulative)

recordTransaction():
  ├── If new day → reset dailySpent to 0
  └── dailySpent += amount
```

#### Storage

| Variable | Type | Purpose |
|---|---|---|
| `defaultDailyLimit` | `uint256` | Global daily cap |
| `defaultMaxTxAmount` | `uint256` | Global per-tx cap |
| `vaultDailyLimits` | `mapping(address ⇒ uint256)` | Per-vault override |
| `vaultMaxTxAmounts` | `mapping(address ⇒ uint256)` | Per-vault override |
| `_dailySpending` | `mapping(address ⇒ DailySpending)` | Cumulative tracker |

#### DailySpending Struct

```solidity
struct DailySpending {
    uint256 spent;      // Amount spent in current window
    uint256 dayNumber;  // timestamp / 1 days — auto-resets
}
```

#### Day Boundary Reset

The day boundary is computed as `block.timestamp / 1 days`. When the day number changes, `spent` resets to 0 automatically in `recordTransaction()`. No external cron or keeper needed.

---

### WhitelistPolicy

**Type:** Stateless (no `recordTransaction` override needed)

```
validate():
  └── Check: isWhitelisted[vault][to] == true
```

Per-vault recipient allowlists. Batch add/remove supported. Zero-trust default — no address is allowed until explicitly whitelisted.

---

### TimelockPolicy

**Type:** Stateful (records last transfer timestamp per vault)

```
validate():
  └── Check: block.timestamp >= lastTransferTime[vault] + cooldownDuration[vault]

recordTransaction():
  └── lastTransferTime[vault] = block.timestamp
```

Prevents rapid-fire extraction. Configurable cooldown per vault.

---

### MultiSigPolicy

**Type:** Stateful (tracks approvals per transaction identity)

```
validate():
  ├── Compute txHash = keccak256(vault, token, to, amount)
  └── Check: approvalCount[txHash] >= threshold[vault]

recordTransaction():
  └── Clear all approvals for txHash (reset after execution)
```

#### Transaction Identity

```solidity
bytes32 txHash = keccak256(abi.encodePacked(vault, token, to, amount));
```

Signers approve a specific `(vault, token, to, amount)` tuple. Once threshold is met and the tx executes, all approvals for that hash are cleared.

#### Auto-Register

Signers are automatically registered on first approval. No separate registration step.

---

### RiskScorePolicy

**Type:** Stateless

```
validate():
  └── Check: riskScore[to] >= minThreshold
      └── If no custom score → use defaultScore
```

Addresses scored 0–100. Batch scoring supported. Blocks transfers to addresses below the vault's risk threshold.

---

### OracleRiskScorePolicy

**File:** `contracts/policies/OracleRiskScorePolicy.sol`
**Type:** Stateless (reads live oracle data)
**External Dependency:** Chainlink AggregatorV3Interface (ETH/USD)

#### Dual-Mode Scoring Architecture

```
getEffectiveScore(target):
  ├── oracleScore = getOracleScore()     // From Chainlink price deviation
  ├── manualScore = _riskScores[target]   // Admin-set score
  └── return min(oracleScore, manualScore) // Conservative wins
```

#### Oracle Score Calculation

```
getOracleScore():
  ├── latestPrice = priceFeed.latestRoundData()
  ├── deviation = |latestPrice - anchorPrice| / anchorPrice × 10000 (basis points)
  │
  ├── deviation < 200 bp (2%)  → score = 100 (stable)
  ├── deviation < 500 bp (5%)  → score = 70  (mild volatility)
  ├── deviation < 1000 bp (10%)→ score = 40  (significant)
  └── deviation ≥ 1000 bp      → score = 10  (market stress)
```

#### Staleness Protection

```
if (block.timestamp - oracleTimestamp > stalenessThreshold):
    → Fall back to manual score only
    → Oracle score ignored
    → Treasury operations continue uninterrupted
```

> **No oracle dependency can freeze treasury operations.** This is a critical reliability guarantee.

#### Anchor Price

The anchor price is set at deployment and can be refreshed by the owner via `refreshAnchorPrice()`. Deviation is always measured relative to this anchor.

---

## Registry

### PolicyRegistry

**File:** `contracts/registry/PolicyRegistry.sol`
**Inheritance:** `IPolicyRegistry → Ownable`
**Role:** Approved policy catalog. Provides a whitelist of verified policy contracts.

#### Interface Verification

When registering a policy, the registry calls `IPolicy(policy).policyName()` as a lightweight interface check. If the call reverts, the policy is rejected.

#### Storage Pattern: Swap-and-Pop

```solidity
// Removal: O(1) instead of O(n)
_policies[index] = _policies[_policies.length - 1];
_policies.pop();
```

---

## Stylus WASM Layer

### SpendingLimitPolicy (Rust)

**File:** `stylus-policies/src/lib.rs`
**Runtime:** Arbitrum Stylus (compiled to WASM)
**SDK:** `stylus-sdk v0.10.0`, `alloy-primitives v1.3`

The Stylus version is a **1:1 mirror** of the Solidity SpendingLimitPolicy, deployed as a WASM contract on Arbitrum for ~8–9x gas savings.

#### Why Stylus for This Policy

SpendingLimitPolicy is the **hottest path** in the system — called on every single transfer. Moving it to WASM provides the highest ROI for gas optimization.

#### Measured Performance

| Metric | Solidity | Stylus (Rust) |
|---|---|---|
| `validate()` gas | ~42,000 | ~4,800 |
| Bytecode size | ~4.2 KB (EVM) | 11.5 KB (WASM) |
| **Improvement** | baseline | **~8–9x cheaper** |

#### Storage Layout

```rust
sol_storage! {
    #[entrypoint]
    pub struct SpendingLimitPolicy {
        address owner;
        address policy_engine_address;
        bool initialized;
        uint256 default_daily_limit;
        uint256 default_max_tx_amount;
        mapping(address => uint256) vault_daily_limits;
        mapping(address => uint256) vault_max_tx_amounts;
        mapping(address => uint256) daily_spent;
        mapping(address => uint256) last_day;
    }
}
```

#### Key Functions

```rust
#[public]
impl SpendingLimitPolicy {
    fn validate(&self, vault: Address, _token: Address, _to: Address, amount: U256) -> bool;
    fn record_transaction(&mut self, vault: Address, _token: Address, _to: Address, amount: U256);
    fn set_vault_daily_limit(&mut self, vault: Address, limit: U256);
    fn set_vault_max_tx_amount(&mut self, vault: Address, max_amount: U256);
    // ... view functions
}
```

#### Guard Pattern

```rust
fn only_policy_engine(&self) -> Result<(), Vec<u8>> {
    if msg::sender() != self.policy_engine_address.get() {
        return Err(OnlyPolicyEngine {}.abi_encode_args());
    }
    Ok(())
}
```

#### ABI Compatibility

The Rust contract emits Solidity ABI-compatible events and errors, making it a **drop-in replacement** for the Solidity version. The PolicyEngine doesn't need to know whether it's calling a Solidity or Stylus policy.

---

## Security Model

### 4-Layer Defense

```
Layer 1: ACCESS CONTROL
  ├── Treasury: ADMIN_ROLE, EXECUTOR_ROLE, PAUSER_ROLE
  ├── PolicyEngine: onlyOwner, onlyVaultOwner
  ├── Firewall: onlyOwner, onlyAuthorizedVault
  └── Policies: onlyPolicyEngine, onlyOwner

Layer 2: EXECUTION FIREWALL
  ├── Tokens held by Treasury — not directly accessible
  ├── Only firewall can call safeTransferFrom
  └── Firewall only acts after PolicyEngine approval

Layer 3: POLICY PIPELINE (AND Logic)
  ├── SpendingLimitPolicy — cumulative + per-tx caps
  ├── WhitelistPolicy — recipient allowlist
  ├── TimelockPolicy — cooldown enforcement
  ├── MultiSigPolicy — M-of-N approval
  ├── RiskScorePolicy — address scoring
  └── OracleRiskScorePolicy — market-adaptive risk

Layer 4: CIRCUIT BREAKERS (3 Independent)
  ├── PolicyEngine.pause()   — blocks all validation
  ├── TreasuryFirewall.pause() — blocks all screening
  └── Treasury.emergencyPause() — blocks all requests
  └── ANY ONE pause freezes the entire system
```

### Cross-Cutting Security Patterns

| Pattern | Contracts | Purpose |
|---|---|---|
| **ReentrancyGuard** | PolicyEngine, TreasuryFirewall, Treasury, TransactionExecutor | Prevent reentrancy attacks |
| **Pausable** | PolicyEngine, TreasuryFirewall, Treasury | Emergency freeze |
| **SafeERC20** | TreasuryFirewall, Treasury, TransactionExecutor | Safe token operations |
| **Custom Errors** | All 17 contracts | Gas-efficient, parseable error reporting |
| **No string reverts** | All contracts | Frontend-parseable errors only |

### Circuit Breaker Behavior

```
                Normal Operation
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
     PolicyEngine  Firewall   Treasury
     .pause()      .pause()   .emergencyPause()
          │           │           │
          └───────────┼───────────┘
                      ▼
              ALL TRANSFERS HALTED
              (any single pause is sufficient)
```

---

## Gas Optimization

### Solidity Optimizations

| Technique | Impact |
|---|---|
| **Optimizer (200 runs)** | Reduced bytecode + cheaper execution |
| **viaIR** | Yul intermediate representation — better optimization |
| **View-call validation** | Failed txs don't pay gas for state writes |
| **Swap-and-pop arrays** | O(1) policy removal instead of O(n) |
| **Custom errors** | 4x cheaper than `require("string")` |
| **Packed storage** | Minimize SLOAD/SSTORE where possible |

### Stylus Optimization

| Technique | Impact |
|---|---|
| **WASM native execution** | ~8–9x cheaper than EVM for compute-heavy paths |
| **Rust zero-cost abstractions** | No runtime overhead |
| **Targeted deployment** | Only the hottest path (SpendingLimit) moved to Stylus |

### Pre-Flight Simulation

The frontend calls `validate()` (view functions) before submitting transactions. This means:
- Users never waste gas on transactions that would be rejected
- The exact rejection reason is shown in the UI before the tx is sent
- Same validation logic, zero gas cost for checking

---

## Interface Specifications

### IPolicy

```solidity
interface IPolicy {
    function policyName() external view returns (string memory);
    function validate(address vault, address token, address to, uint256 amount) external view;
    function recordTransaction(address vault, address token, address to, uint256 amount) external;
}
```

### IPolicyEngine

```solidity
interface IPolicyEngine {
    function registerVault(address vault) external;
    function addPolicy(address vault, address policy) external;
    function removePolicy(address vault, address policy) external;
    function validateTransaction(address vault, address token, address to, uint256 amount) external;
    function getVaultPolicies(address vault) external view returns (address[] memory);
    function isPolicyActive(address vault, address policy) external view returns (bool);
    function getVaultOwner(address vault) external view returns (address);
    function isVaultRegistered(address vault) external view returns (bool);
}
```

### ITreasuryFirewall

```solidity
interface ITreasuryFirewall {
    function screenAndExecute(address vault, address token, address to, uint256 amount) external;
    function authorizeVault(address vault) external;
    function revokeVault(address vault) external;
    function isVaultAuthorized(address vault) external view returns (bool);
}
```

### IChainlinkFeed

```solidity
interface IChainlinkFeed {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}
```

---

## Deployment Topology

### Arbitrum Sepolia (Live)

```
┌─ Core ──────────────────────────────────────────────────┐
│ PolicyEngine         0x245118Fba999F1ed338174933f83bdD6  │
│ TreasuryFirewall     0xE3Be337BdC98Af11D3C8bcaB9149356A  │
│ TransactionExecutor  (embedded)                          │
└──────────────────────────────────────────────────────────┘

┌─ Vault ─────────────────────────────────────────────────┐
│ Treasury             0x9BcF0E126b82C8E7cC5151C77025b052  │
│ PolicyRegistry       0x5f36947d6d829616bAd785Be7eCb13cf  │
└──────────────────────────────────────────────────────────┘

┌─ Policies (Solidity) ───────────────────────────────────┐
│ SpendingLimitPolicy  0x17580a550087C55CF68AD9Cc19F56862  │
│ WhitelistPolicy      0x1EdaAD6c6F5C8d5fb901e83f73b3BD0D  │
│ TimelockPolicy       0xa9BB981a309DEf9b74A390f2170fE56C  │
│ MultiSigPolicy       0x88010789fF9109A00912F9a9a62414D8  │
│ RiskScorePolicy      0x54305829743e301ebF8D868037B4081c  │
│ OracleRiskScorePolicy 0x52d4E065453d0E3aabE727A38A33bFb │
└──────────────────────────────────────────────────────────┘

┌─ Stylus (WASM) ─────────────────────────────────────────┐
│ SpendingLimitPolicy  0xb92da51e406b72fddd4cdc03b32ddd2b  │
│ (11.5 KB · Rust · cached)                                │
└──────────────────────────────────────────────────────────┘

┌─ External ──────────────────────────────────────────────┐
│ Chainlink ETH/USD    0xd30e2101a97dcbAeBCBC04F14C3f624E  │
│ MockUSDC             0xee71e4d5b0D6588FFdf5713f9791eD63  │
└──────────────────────────────────────────────────────────┘
```

### Contract Interaction Map

```
Treasury ──approves──▶ TreasuryFirewall ──validates──▶ PolicyEngine
    │                        │                              │
    │                        │                       iterates over
    │                        │                              │
    │                   executes                    ┌───────┴───────┐
    │               safeTransferFrom                │  Policy[0..5] │
    │                                               │  .validate()  │
    │                                               │  .record()    │
    │                                               └───────────────┘
    │
    └── holds all ERC-20 tokens
```

---

## Extending FortiLayer

### Adding a New Policy

```solidity
// 1. Create your policy
contract MyCustomPolicy is BasePolicy {
    function policyName() external pure override returns (string memory) {
        return "MyCustomPolicy";
    }

    function validate(
        address vault,
        address token,
        address to,
        uint256 amount
    ) external view override {
        // Your validation logic
        // Revert with custom error if validation fails
    }

    // Optional: override if your policy is stateful
    function recordTransaction(
        address vault,
        address token,
        address to,
        uint256 amount
    ) external override onlyPolicyEngine {
        // Update state after successful validation
    }
}

// 2. Deploy
MyCustomPolicy policy = new MyCustomPolicy(policyEngineAddress);

// 3. Register with registry (optional, for discoverability)
policyRegistry.registerPolicy(address(policy));

// 4. Attach to vault — live immediately
policyEngine.addPolicy(vaultAddress, address(policy));
```

---

*Built for Arbitrum. Powered by Stylus. Secured by Chainlink.* 🔵🦀🔗
