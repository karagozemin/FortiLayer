// FortiLayer — SpendingLimitPolicy (Arbitrum Stylus / Rust)
//
// Production Stylus smart contract enforcing daily cumulative spending
// limits and per-transaction maximums on treasury vaults.
// Mirrors the Solidity SpendingLimitPolicy but runs as WASM on Arbitrum
// for 10-100x gas savings on compute-heavy validation.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;
use alloy_primitives::{Address, U256};
use alloy_sol_types::{sol, SolError};
use stylus_sdk::prelude::*;

// ─── Custom Errors (Solidity ABI compatible) ────────────────────────────────

sol! {
    error DailyLimitExceeded(address vault, uint256 spent, uint256 limit);
    error MaxTransactionExceeded(address vault, uint256 amount, uint256 max_amount);
    error NotPolicyEngine(address caller);
    error NotOwner(address caller);
    error ZeroAddress();
    error InvalidLimit(uint256 value);
    error AlreadyInitialized();
}

// ─── Events ─────────────────────────────────────────────────────────────────

sol! {
    event VaultDailyLimitSet(address indexed vault, uint256 limit);
    event VaultMaxTxAmountSet(address indexed vault, uint256 max_amount);
    event TransactionRecorded(address indexed vault, uint256 amount, uint256 new_daily_total);
    event DailySpendReset(address indexed vault, uint256 new_day);
    event OwnershipTransferred(address indexed previous_owner, address indexed new_owner);
}

// ─── Storage Layout ─────────────────────────────────────────────────────────

sol_storage! {
    #[entrypoint]
    pub struct SpendingLimitPolicy {
        /// Contract owner
        address owner;
        /// Authorized PolicyEngine address
        address policy_engine;
        /// Whether the contract is initialized
        bool initialized;
        /// Default daily limit (applies to all vaults without override)
        uint256 default_daily_limit;
        /// Default max per-tx amount
        uint256 default_max_tx_amount;
        /// Per-vault daily limit overrides
        mapping(address => uint256) vault_daily_limits;
        /// Per-vault max tx amount overrides
        mapping(address => uint256) vault_max_tx_amounts;
        /// Whether a vault has a custom daily limit set
        mapping(address => bool) has_vault_daily_limit;
        /// Whether a vault has a custom max tx amount set
        mapping(address => bool) has_vault_max_tx;
        /// Daily spend tracker: vault => last tracked day
        mapping(address => uint256) vault_last_day;
        /// Daily spend tracker: vault => cumulative spent today
        mapping(address => uint256) vault_daily_spent;
    }
}

// ─── Seconds per day constant ───────────────────────────────────────────────

const SECONDS_PER_DAY: u64 = 86400;

// ─── Public Interface ───────────────────────────────────────────────────────

#[public]
impl SpendingLimitPolicy {
    // ── Initialization ──────────────────────────────────────────────────

    /// Initialize the contract (can only be called once).
    /// Sets the owner to msg_sender, configures the PolicyEngine address,
    /// and sets default limits.
    pub fn initialize(
        &mut self,
        engine: Address,
        daily_limit: U256,
        max_tx_amount: U256,
    ) -> Result<(), Vec<u8>> {
        if self.initialized.get() {
            return Err(AlreadyInitialized {}.abi_encode());
        }
        if engine.is_zero() {
            return Err(ZeroAddress {}.abi_encode());
        }
        if daily_limit.is_zero() || max_tx_amount.is_zero() {
            return Err(InvalidLimit { value: U256::ZERO }.abi_encode());
        }

        let sender = self.vm().msg_sender();
        self.owner.set(sender);
        self.policy_engine.set(engine);
        self.default_daily_limit.set(daily_limit);
        self.default_max_tx_amount.set(max_tx_amount);
        self.initialized.set(true);

        self.vm().log(OwnershipTransferred {
            previous_owner: Address::ZERO,
            new_owner: sender,
        });

        Ok(())
    }

    // ── IPolicy Interface ───────────────────────────────────────────────

    /// Returns the policy name (IPolicy interface).
    pub fn policy_name(&self) -> Result<String, Vec<u8>> {
        Ok(String::from("SpendingLimitPolicy (Stylus)"))
    }

    /// Validate a transaction against spending limits.
    /// Phase 1 of FortiLayer's validate-then-record pattern.
    /// Pure validation — no storage writes.
    pub fn validate(
        &self,
        vault: Address,
        _token: Address,
        _to: Address,
        amount: U256,
    ) -> Result<bool, Vec<u8>> {
        // 1. Per-transaction maximum check
        let max_tx = self._get_max_tx_amount(vault);
        if amount > max_tx {
            return Err(MaxTransactionExceeded {
                vault,
                amount,
                max_amount: max_tx,
            }
            .abi_encode());
        }

        // 2. Daily cumulative limit check
        let daily_limit = self._get_daily_limit(vault);
        let today = self._current_day();
        let last_day = self.vault_last_day.get(vault);

        // If it's a new day, spent resets to 0
        let current_spent = if last_day == today {
            self.vault_daily_spent.get(vault)
        } else {
            U256::ZERO
        };

        if current_spent + amount > daily_limit {
            return Err(DailyLimitExceeded {
                vault,
                spent: current_spent + amount,
                limit: daily_limit,
            }
            .abi_encode());
        }

        Ok(true)
    }

    /// Record a transaction after successful validation (Phase 2).
    /// Called by PolicyEngine after ALL policies pass validation.
    /// Updates cumulative daily spend for the vault.
    pub fn record_transaction(
        &mut self,
        vault: Address,
        _token: Address,
        _to: Address,
        amount: U256,
    ) -> Result<(), Vec<u8>> {
        // Only PolicyEngine can call this
        let sender = self.vm().msg_sender();
        if sender != self.policy_engine.get() {
            return Err(NotPolicyEngine { caller: sender }.abi_encode());
        }

        let today = self._current_day();
        let last_day = self.vault_last_day.get(vault);

        // Reset if new day
        let current_spent = if last_day == today {
            self.vault_daily_spent.get(vault)
        } else {
            // Emit reset event
            self.vm().log(DailySpendReset {
                vault,
                new_day: today,
            });
            U256::ZERO
        };

        let new_total = current_spent + amount;

        // Update storage
        self.vault_last_day.setter(vault).set(today);
        self.vault_daily_spent.setter(vault).set(new_total);

        self.vm().log(TransactionRecorded {
            vault,
            amount,
            new_daily_total: new_total,
        });

        Ok(())
    }

    // ── Configuration (owner only) ──────────────────────────────────────

    /// Set daily limit for a specific vault.
    pub fn set_vault_daily_limit(
        &mut self,
        vault: Address,
        limit: U256,
    ) -> Result<(), Vec<u8>> {
        self._only_owner()?;
        if vault.is_zero() {
            return Err(ZeroAddress {}.abi_encode());
        }
        if limit.is_zero() {
            return Err(InvalidLimit { value: limit }.abi_encode());
        }

        self.vault_daily_limits.setter(vault).set(limit);
        self.has_vault_daily_limit.setter(vault).set(true);

        self.vm().log(VaultDailyLimitSet { vault, limit });
        Ok(())
    }

    /// Set max per-transaction amount for a specific vault.
    pub fn set_vault_max_tx_amount(
        &mut self,
        vault: Address,
        max_amount: U256,
    ) -> Result<(), Vec<u8>> {
        self._only_owner()?;
        if vault.is_zero() {
            return Err(ZeroAddress {}.abi_encode());
        }
        if max_amount.is_zero() {
            return Err(InvalidLimit { value: max_amount }.abi_encode());
        }

        self.vault_max_tx_amounts.setter(vault).set(max_amount);
        self.has_vault_max_tx.setter(vault).set(true);

        self.vm().log(VaultMaxTxAmountSet { vault, max_amount });
        Ok(())
    }

    /// Set default daily limit (applies to vaults without overrides).
    pub fn set_default_daily_limit(&mut self, limit: U256) -> Result<(), Vec<u8>> {
        self._only_owner()?;
        if limit.is_zero() {
            return Err(InvalidLimit { value: limit }.abi_encode());
        }
        self.default_daily_limit.set(limit);
        Ok(())
    }

    /// Set default max per-tx amount.
    pub fn set_default_max_tx_amount(&mut self, max_amount: U256) -> Result<(), Vec<u8>> {
        self._only_owner()?;
        if max_amount.is_zero() {
            return Err(InvalidLimit { value: max_amount }.abi_encode());
        }
        self.default_max_tx_amount.set(max_amount);
        Ok(())
    }

    /// Transfer ownership to a new address.
    pub fn transfer_ownership(&mut self, new_owner: Address) -> Result<(), Vec<u8>> {
        self._only_owner()?;
        if new_owner.is_zero() {
            return Err(ZeroAddress {}.abi_encode());
        }
        let old_owner = self.owner.get();
        self.owner.set(new_owner);

        self.vm().log(OwnershipTransferred {
            previous_owner: old_owner,
            new_owner,
        });
        Ok(())
    }

    // ── View Functions ──────────────────────────────────────────────────

    /// Get the effective daily limit for a vault.
    pub fn get_daily_limit(&self, vault: Address) -> U256 {
        self._get_daily_limit(vault)
    }

    /// Get the effective max tx amount for a vault.
    pub fn get_max_tx_amount(&self, vault: Address) -> U256 {
        self._get_max_tx_amount(vault)
    }

    /// Get today's cumulative spend for a vault.
    pub fn get_daily_spent(&self, vault: Address) -> U256 {
        let today = self._current_day();
        let last_day = self.vault_last_day.get(vault);
        if last_day == today {
            self.vault_daily_spent.get(vault)
        } else {
            U256::ZERO
        }
    }

    /// Get the remaining daily allowance for a vault.
    pub fn get_remaining_allowance(&self, vault: Address) -> U256 {
        let limit = self._get_daily_limit(vault);
        let spent = self.get_daily_spent(vault);
        if spent >= limit {
            U256::ZERO
        } else {
            limit - spent
        }
    }

    /// Get contract owner.
    pub fn get_owner(&self) -> Address {
        self.owner.get()
    }

    /// Get policy engine address.
    pub fn get_policy_engine(&self) -> Address {
        self.policy_engine.get()
    }
}

// ─── Internal Methods ───────────────────────────────────────────────────────

impl SpendingLimitPolicy {
    fn _only_owner(&self) -> Result<(), Vec<u8>> {
        let sender = self.vm().msg_sender();
        if sender != self.owner.get() {
            return Err(NotOwner { caller: sender }.abi_encode());
        }
        Ok(())
    }

    fn _current_day(&self) -> U256 {
        U256::from(self.vm().block_timestamp()) / U256::from(SECONDS_PER_DAY)
    }

    fn _get_daily_limit(&self, vault: Address) -> U256 {
        if self.has_vault_daily_limit.get(vault) {
            self.vault_daily_limits.get(vault)
        } else {
            self.default_daily_limit.get()
        }
    }

    fn _get_max_tx_amount(&self, vault: Address) -> U256 {
        if self.has_vault_max_tx.get(vault) {
            self.vault_max_tx_amounts.get(vault)
        } else {
            self.default_max_tx_amount.get()
        }
    }
}

// ─── ABI Export (handled by main.rs) ────────────────────────────────────────
