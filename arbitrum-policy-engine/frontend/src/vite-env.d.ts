/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POLICY_ENGINE: string;
  readonly VITE_TREASURY_FIREWALL: string;
  readonly VITE_TRANSACTION_EXECUTOR: string;
  readonly VITE_POLICY_REGISTRY: string;
  readonly VITE_TREASURY: string;
  readonly VITE_MOCK_USDC: string;
  readonly VITE_SPENDING_LIMIT_POLICY: string;
  readonly VITE_WHITELIST_POLICY: string;
  readonly VITE_TIMELOCK_POLICY: string;
  readonly VITE_MULTISIG_POLICY: string;
  readonly VITE_RISK_SCORE_POLICY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
