import { DeployedAddresses } from '../types';

// ── Deployed Contract Addresses ────────────────────────────────
// Update these after deploying to Arbitrum Sepolia
// Run: npx hardhat run scripts/deploy.ts --network arbitrumSepolia

export const DEPLOYED_ADDRESSES: DeployedAddresses = {
  policyEngine: import.meta.env.VITE_POLICY_ENGINE || '',
  treasuryFirewall: import.meta.env.VITE_TREASURY_FIREWALL || '',
  transactionExecutor: import.meta.env.VITE_TRANSACTION_EXECUTOR || '',
  policyRegistry: import.meta.env.VITE_POLICY_REGISTRY || '',
  treasury: import.meta.env.VITE_TREASURY || '',
  mockUSDC: import.meta.env.VITE_MOCK_USDC || '',
  spendingLimitPolicy: import.meta.env.VITE_SPENDING_LIMIT_POLICY || '',
  whitelistPolicy: import.meta.env.VITE_WHITELIST_POLICY || '',
  timelockPolicy: import.meta.env.VITE_TIMELOCK_POLICY || '',
  multiSigPolicy: import.meta.env.VITE_MULTISIG_POLICY || '',
  riskScorePolicy: import.meta.env.VITE_RISK_SCORE_POLICY || '',
};

// ── Minimal ABIs (human-readable for ethers v6) ────────────────

export const ABIS = {
  PolicyEngine: [
    'function owner() view returns (address)',
    'function paused() view returns (bool)',
    'function totalVaults() view returns (uint256)',
    'function totalTransactionsValidated() view returns (uint256)',
    'function getVaultPolicies(address vault) view returns (address[])',
    'function isVaultRegistered(address vault) view returns (bool)',
    'function validateTransaction(address vault, address token, address to, uint256 amount) view returns (bool)',
    'function registerVault(address vault)',
    'function addPolicy(address vault, address policy)',
    'function removePolicy(address vault, address policy)',
    'function pause()',
    'function unpause()',
    'event VaultRegistered(address indexed vault, address indexed owner)',
    'event PolicyAdded(address indexed vault, address indexed policy, string policyName)',
    'event PolicyRemoved(address indexed vault, address indexed policy)',
    'event TransactionValidated(address indexed vault, address indexed token, address indexed to, uint256 amount, bool passed)',
  ],

  TreasuryFirewall: [
    'function policyEngine() view returns (address)',
    'function totalScreened() view returns (uint256)',
    'function totalPassed() view returns (uint256)',
    'function totalBlocked() view returns (uint256)',
    'function isAuthorizedVault(address vault) view returns (bool)',
    'function screenAndExecute(address vault, address token, address to, uint256 amount)',
    'function authorizeVault(address vault)',
    'function revokeVault(address vault)',
    'event ScreeningPassed(address indexed vault, address indexed token, address indexed to, uint256 amount)',
    'event ScreeningBlocked(address indexed vault, address indexed token, address indexed to, uint256 amount, string reason)',
  ],

  Treasury: [
    'function firewall() view returns (address)',
    'function paused() view returns (bool)',
    'function getBalance(address token) view returns (uint256)',
    'function deposit(address token, uint256 amount)',
    'function requestTransfer(address token, address to, uint256 amount)',
    'function emergencyPause()',
    'function emergencyUnpause()',
    'event Deposited(address indexed token, address indexed from, uint256 amount)',
    'event TransferRequested(address indexed token, address indexed to, uint256 amount)',
  ],

  PolicyRegistry: [
    'function isApproved(address policy) view returns (bool)',
    'function getApprovedPolicies() view returns (address[])',
    'function approvedCount() view returns (uint256)',
    'function registerPolicy(address policy)',
    'function unregisterPolicy(address policy)',
    'event PolicyRegistered(address indexed policy, string name)',
    'event PolicyUnregistered(address indexed policy)',
  ],

  MockUSDC: [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function mint(address to, uint256 amount)',
  ],

  SpendingLimitPolicy: [
    'function policyName() view returns (string)',
    'function defaultDailyLimit() view returns (uint256)',
    'function defaultMaxPerTx() view returns (uint256)',
    'function getVaultLimits(address vault) view returns (uint256 dailyLimit, uint256 maxPerTx)',
    'function getDailySpending(address vault) view returns (uint256 spent, uint256 dayStart)',
    'function setVaultLimits(address vault, uint256 dailyLimit, uint256 maxPerTx)',
    'function setDefaultLimits(uint256 dailyLimit, uint256 maxPerTx)',
  ],

  WhitelistPolicy: [
    'function policyName() view returns (string)',
    'function isWhitelisted(address vault, address addr) view returns (bool)',
    'function isGloballyWhitelisted(address addr) view returns (bool)',
    'function addToWhitelist(address vault, address addr)',
    'function removeFromWhitelist(address vault, address addr)',
    'function addToGlobalWhitelist(address addr)',
    'function removeFromGlobalWhitelist(address addr)',
    'function batchAddToWhitelist(address vault, address[] addrs)',
  ],

  TimelockPolicy: [
    'function policyName() view returns (string)',
    'function defaultCooldown() view returns (uint256)',
    'function getVaultCooldown(address vault) view returns (uint256)',
    'function getLastTxTimestamp(address vault) view returns (uint256)',
    'function setVaultCooldown(address vault, uint256 cooldown)',
    'function setDefaultCooldown(uint256 cooldown)',
    'function emergencyReset(address vault)',
  ],

  MultiSigPolicy: [
    'function policyName() view returns (string)',
    'function getSigners(address vault) view returns (address[])',
    'function getRequiredApprovals(address vault) view returns (uint256)',
    'function getApprovalCount(address vault, bytes32 txHash) view returns (uint256)',
    'function hasApproved(address vault, bytes32 txHash, address signer) view returns (bool)',
    'function setupMultiSig(address vault, address[] signers, uint256 required)',
    'function approve(address vault, bytes32 txHash)',
  ],

  RiskScorePolicy: [
    'function policyName() view returns (string)',
    'function defaultMinThreshold() view returns (uint256)',
    'function defaultScore() view returns (uint256)',
    'function getAddressScore(address addr) view returns (uint256)',
    'function getVaultThreshold(address vault) view returns (uint256)',
    'function wouldPass(address vault, address addr) view returns (bool)',
    'function setAddressScore(address addr, uint256 score)',
    'function setVaultThreshold(address vault, uint256 threshold)',
    'function batchSetScores(address[] addrs, uint256[] scores)',
  ],
};

// ── Helpers ────────────────────────────────────────────────────

export function shortenAddress(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatUSDC(amount: string | bigint, decimals = 6): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount) / 10 ** decimals;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getExplorerUrl(txHash: string): string {
  return `https://sepolia.arbiscan.io/tx/${txHash}`;
}

export function getAddressExplorerUrl(address: string): string {
  return `https://sepolia.arbiscan.io/address/${address}`;
}
