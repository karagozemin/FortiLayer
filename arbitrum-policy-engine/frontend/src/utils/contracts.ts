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
// Audited against deployed Solidity source — all function names verified

export const ABIS = {
  PolicyEngine: [
    'function owner() view returns (address)',
    'function paused() view returns (bool)',
    'function totalVaults() view returns (uint256)',
    'function totalTransactionsValidated() view returns (uint256)',
    'function getVaultPolicies(address vault) view returns (address[])',
    'function isPolicyActive(address vault, address policy) view returns (bool)',
    'function getVaultOwner(address vault) view returns (address)',
    'function isVaultRegistered(address vault) view returns (bool)',
    'function validateTransaction(address vault, address token, address to, uint256 amount) returns (bool)',
    'function registerVault(address vault)',
    'function addPolicy(address vault, address policy)',
    'function removePolicy(address vault, address policy)',
    'function pause()',
    'function unpause()',
    'event VaultRegistered(address indexed vault, address indexed owner)',
    'event PolicyAdded(address indexed vault, address indexed policy)',
    'event PolicyRemoved(address indexed vault, address indexed policy)',
    'event TransactionValidated(address indexed vault, address indexed token, address indexed to, uint256 amount)',
    'event TransactionRejected(address indexed vault, address indexed token, address to, uint256 amount, address failedPolicy)',
    // Custom errors
    'error ZeroAddress()',
    'error PolicyAlreadyRegistered(address vault, address policy)',
    'error PolicyNotRegistered(address vault, address policy)',
    'error TransactionNotCompliant(address vault, address failedPolicy)',
    'error NotVaultOwner(address caller, address vault)',
    'error VaultAlreadyRegistered(address vault)',
    'error VaultNotRegistered(address vault)',
    'error OwnableUnauthorizedAccount(address account)',
    'error OwnableInvalidOwner(address owner)',
    'error EnforcedPause()',
    'error ExpectedPause()',
  ],

  TreasuryFirewall: [
    'function policyEngine() view returns (address)',
    'function totalScreened() view returns (uint256)',
    'function totalPassed() view returns (uint256)',
    'function totalBlocked() view returns (uint256)',
    'function isVaultAuthorized(address vault) view returns (bool)',
    'function screenAndExecute(address vault, address token, address to, uint256 amount) returns (bool)',
    'function authorizeVault(address vault)',
    'function revokeVault(address vault)',
    'function setPolicyEngine(address _policyEngine)',
    'function pause()',
    'function unpause()',
    'function owner() view returns (address)',
    'function paused() view returns (bool)',
    'event TransactionScreened(address indexed vault, address indexed token, address indexed to, uint256 amount, bool passed)',
    'event VaultAuthorized(address indexed vault)',
    'event VaultRevoked(address indexed vault)',
    // Custom errors
    'error ZeroAddress()',
    'error TransactionBlocked(address vault, address token, address to, uint256 amount)',
    'error VaultNotAuthorized(address vault)',
    'error OwnableUnauthorizedAccount(address account)',
    'error OwnableInvalidOwner(address owner)',
    'error EnforcedPause()',
    'error ExpectedPause()',
  ],

  Treasury: [
    'function firewall() view returns (address)',
    'function paused() view returns (bool)',
    'function totalTransfersExecuted() view returns (uint256)',
    'function getBalance(address token) view returns (uint256)',
    'function deposit(address token, uint256 amount)',
    'function requestTransfer(address token, address to, uint256 amount) returns (bytes32)',
    'function emergencyPause()',
    'function emergencyUnpause()',
    'function emergencyWithdraw(address token, address to, uint256 amount)',
    'function setFirewall(address _firewall)',
    // AccessControl role functions
    'function hasRole(bytes32 role, address account) view returns (bool)',
    'function getRoleAdmin(bytes32 role) view returns (bytes32)',
    'function ADMIN_ROLE() view returns (bytes32)',
    'function EXECUTOR_ROLE() view returns (bytes32)',
    'function PAUSER_ROLE() view returns (bytes32)',
    'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
    'event Deposited(address indexed token, address indexed from, uint256 amount)',
    'event TransferRequested(bytes32 indexed txId, address indexed token, address indexed to, uint256 amount, address requestedBy)',
    'event TransferExecuted(bytes32 indexed txId, address indexed token, address indexed to, uint256 amount)',
    'event EmergencyPaused(address indexed by)',
    'event EmergencyUnpaused(address indexed by)',
    // Custom errors
    'error ZeroAddress()',
    'error ZeroAmount()',
    'error InsufficientBalance(address token, uint256 requested, uint256 available)',
    'error TransferFailed(address token, address to, uint256 amount)',
    'error Unauthorized(address caller)',
    'error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)',
    'error AccessControlBadConfirmation()',
    'error EnforcedPause()',
    'error ExpectedPause()',
  ],

  PolicyRegistry: [
    'function isRegistered(address policy) view returns (bool)',
    'function getAllPolicies() view returns (address[])',
    'function getPolicyCount() view returns (uint256)',
    'function registerPolicy(address policy)',
    'function unregisterPolicy(address policy)',
    'function owner() view returns (address)',
    'event PolicyRegistered(address indexed policy, string name)',
    'event PolicyUnregistered(address indexed policy)',
  ],

  MockUSDC: [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() pure returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 value) returns (bool)',
    'function transfer(address to, uint256 value) returns (bool)',
    'function transferFrom(address from, address to, uint256 value) returns (bool)',
    'function mint(address to, uint256 amount)',
  ],

  SpendingLimitPolicy: [
    'function policyName() pure returns (string)',
    'function defaultDailyLimit() view returns (uint256)',
    'function defaultMaxTxAmount() view returns (uint256)',
    'function vaultDailyLimits(address vault) view returns (uint256)',
    'function vaultMaxTxAmounts(address vault) view returns (uint256)',
    'function getDailySpent(address vault) view returns (uint256)',
    'function getRemainingDailyAllowance(address vault) view returns (uint256)',
    'function setVaultDailyLimit(address vault, uint256 limit)',
    'function setVaultMaxTxAmount(address vault, uint256 maxAmount)',
    'function setDefaultDailyLimit(uint256 limit)',
    'function setDefaultMaxTxAmount(uint256 maxAmount)',
    'function validate(address vault, address token, address to, uint256 amount) view returns (bool)',
    'function owner() view returns (address)',
    // Custom errors
    'error OnlyOwner()',
    'error OnlyPolicyEngine()',
    'error ZeroAddress()',
    'error ExceedsMaxTransactionAmount(uint256 amount, uint256 maxAmount)',
    'error ExceedsDailyLimit(uint256 currentSpent, uint256 amount, uint256 dailyLimit)',
    'error InvalidLimit()',
  ],

  WhitelistPolicy: [
    'function policyName() pure returns (string)',
    'function isWhitelisted(address vault, address recipient) view returns (bool)',
    'function isGloballyWhitelisted(address recipient) view returns (bool)',
    'function getVaultWhitelist(address vault) view returns (address[])',
    'function addToVaultWhitelist(address vault, address recipient)',
    'function batchAddToVaultWhitelist(address vault, address[] recipients)',
    'function removeFromVaultWhitelist(address vault, address recipient)',
    'function addToGlobalWhitelist(address recipient)',
    'function removeFromGlobalWhitelist(address recipient)',
    'function validate(address vault, address token, address to, uint256 amount) view returns (bool)',
    'function owner() view returns (address)',
    // Custom errors
    'error OnlyOwner()',
    'error OnlyPolicyEngine()',
    'error ZeroAddress()',
    'error RecipientNotWhitelisted(address vault, address recipient)',
    'error AlreadyWhitelisted(address recipient)',
    'error NotWhitelisted(address recipient)',
    'error EmptyArray()',
  ],

  TimelockPolicy: [
    'function policyName() pure returns (string)',
    'function defaultTimelockDuration() view returns (uint256)',
    'function vaultTimelockDuration(address vault) view returns (uint256)',
    'function lastTransactionTime(address vault) view returns (uint256)',
    'function getEffectiveTimelockDuration(address vault) view returns (uint256)',
    'function getUnlockTime(address vault) view returns (uint256)',
    'function isTimelockExpired(address vault) view returns (bool)',
    'function setVaultTimelockDuration(address vault, uint256 duration)',
    'function setDefaultTimelockDuration(uint256 duration)',
    'function resetTimelock(address vault)',
    'function validate(address vault, address token, address to, uint256 amount) view returns (bool)',
    'function owner() view returns (address)',
    // Custom errors
    'error OnlyOwner()',
    'error OnlyPolicyEngine()',
    'error ZeroAddress()',
    'error TimelockActive(address vault, uint256 unlockTime, uint256 currentTime)',
    'error InvalidDuration()',
  ],

  MultiSigPolicy: [
    'function policyName() pure returns (string)',
    'function requiredApprovals() view returns (uint256)',
    'function getSigners() view returns (address[])',
    'function getSignerCount() view returns (uint256)',
    'function isSigner(address signer) view returns (bool)',
    'function approvalCount(bytes32 txHash) view returns (uint256)',
    'function approvals(bytes32 txHash, address signer) view returns (bool)',
    'function hasEnoughApprovals(bytes32 txHash) view returns (bool)',
    'function getTransactionHash(address vault, address token, address to, uint256 amount) pure returns (bytes32)',
    'function approveTransaction(address vault, address token, address to, uint256 amount)',
    'function revokeApproval(address vault, address token, address to, uint256 amount)',
    'function addSigner(address signer)',
    'function removeSigner(address signer)',
    'function setRequiredApprovals(uint256 _requiredApprovals)',
    'function validate(address vault, address token, address to, uint256 amount) view returns (bool)',
    'function owner() view returns (address)',
    // Custom errors
    'error OnlyOwner()',
    'error OnlyPolicyEngine()',
    'error ZeroAddress()',
    'error NotASigner(address account)',
    'error AlreadySigner(address account)',
    'error AlreadyApproved(bytes32 txHash, address signer)',
    'error NotApproved(bytes32 txHash, address signer)',
    'error InsufficientApprovals(bytes32 txHash, uint256 current, uint256 required)',
    'error InvalidRequiredApprovals(uint256 required)',
  ],

  RiskScorePolicy: [
    'function policyName() pure returns (string)',
    'function minThreshold() view returns (uint256)',
    'function defaultScore() view returns (uint256)',
    'function MAX_SCORE() view returns (uint256)',
    'function getRiskScore(address target) view returns (uint256)',
    'function hasCustomScore(address target) view returns (bool)',
    'function wouldPass(address target) view returns (bool)',
    'function setRiskScore(address target, uint256 score)',
    'function batchSetRiskScores(address[] targets, uint256[] scores)',
    'function setMinThreshold(uint256 _minThreshold)',
    'function setDefaultScore(uint256 _defaultScore)',
    'function validate(address vault, address token, address to, uint256 amount) view returns (bool)',
    'function owner() view returns (address)',
    // Custom errors
    'error OnlyOwner()',
    'error OnlyPolicyEngine()',
    'error ZeroAddress()',
    'error RiskScoreTooLow(address recipient, uint256 score, uint256 threshold)',
    'error InvalidScore(uint256 score)',
    'error InvalidThreshold(uint256 threshold)',
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

/**
 * Extract a human-readable error message from a contract revert.
 * Handles custom Solidity errors, ethers.js error wrapping, and raw strings.
 */
export function parseContractError(err: any): string {
  // ethers.js v6 wraps the reason
  if (err?.reason) return err.reason;
  if (err?.shortMessage) {
    // ethers shortMessage often contains the decoded custom error
    const sm = err.shortMessage as string;
    // Strip 'execution reverted' prefix for cleaner display
    if (sm.includes('execution reverted')) {
      // Check for nested error info
      const info = err?.info?.error?.message || err?.error?.message;
      if (info) return info;
      // Check for revert data that ethers decoded
      const revertData = err?.data;
      if (revertData && revertData !== '0x') {
        return sm;
      }
      return sm.replace('execution reverted: ', '').replace('execution reverted', 'Transaction reverted');
    }
    return sm;
  }
  // Metamask / wallet-level errors
  if (err?.message) {
    const m = err.message as string;
    if (m.includes('user rejected')) return 'Transaction rejected by user';
    if (m.includes('insufficient funds')) return 'Insufficient ETH for gas fees';
    if (m.length > 120) return m.slice(0, 120) + '…';
    return m;
  }
  return 'Transaction failed';
}
