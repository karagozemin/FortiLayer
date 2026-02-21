// ── FortiLayer Type Definitions ─────────────────────────────────

export interface PolicyInfo {
  address: string;
  name: string;
  type: PolicyType;
  active: boolean;
  params: Record<string, string>;
}

export type PolicyType =
  | 'SpendingLimit'
  | 'Whitelist'
  | 'Timelock'
  | 'MultiSig'
  | 'RiskScore';

export interface TransactionRecord {
  id: string;
  vault: string;
  token: string;
  to: string;
  amount: string;
  timestamp: number;
  status: TransactionStatus;
  blockNumber?: number;
  txHash?: string;
  failedPolicy?: string;
}

export type TransactionStatus = 'pending' | 'passed' | 'blocked' | 'executed';

export interface TreasuryStatus {
  address: string;
  balance: string;
  tokenSymbol: string;
  tokenDecimals: number;
  isPaused: boolean;
  totalDeposited: string;
  totalWithdrawn: string;
}

export interface FirewallMetrics {
  totalScreened: number;
  totalPassed: number;
  totalBlocked: number;
  passRate: number;
  isActive: boolean;
  authorizedVaults: string[];
}

export interface VaultConfig {
  owner: string;
  policyCount: number;
  policies: string[];
  isRegistered: boolean;
}

export interface DashboardStats {
  treasuryBalance: string;
  totalTransactions: number;
  activePolicies: number;
  blockedTransactions: number;
  passRate: number;
}

export interface SpendingLimitParams {
  dailyLimit: string;
  maxPerTx: string;
  spent: string;
  dayStart: number;
}

export interface WhitelistParams {
  whitelistedCount: number;
  globalWhitelist: string[];
}

export interface TimelockParams {
  cooldownPeriod: number;
  lastTxTimestamp: number;
}

export interface MultiSigParams {
  required: number;
  signers: string[];
  pendingApprovals: number;
}

export interface RiskScoreParams {
  minThreshold: number;
  defaultScore: number;
}

export type PolicyParams =
  | SpendingLimitParams
  | WhitelistParams
  | TimelockParams
  | MultiSigParams
  | RiskScoreParams;

// ── Contract Addresses ─────────────────────────────────────────

export interface DeployedAddresses {
  policyEngine: string;
  treasuryFirewall: string;
  transactionExecutor: string;
  policyRegistry: string;
  treasury: string;
  mockUSDC: string;
  spendingLimitPolicy: string;
  whitelistPolicy: string;
  timelockPolicy: string;
  multiSigPolicy: string;
  riskScorePolicy: string;
}

// ── Events ─────────────────────────────────────────────────────

export interface TransactionValidatedEvent {
  vault: string;
  token: string;
  to: string;
  amount: bigint;
  passed: boolean;
  timestamp: number;
}

export interface PolicyAddedEvent {
  vault: string;
  policy: string;
  policyName: string;
}

export interface ScreeningResultEvent {
  vault: string;
  token: string;
  to: string;
  amount: bigint;
  passed: boolean;
}
