import { useMemo } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { DEPLOYED_ADDRESSES, ABIS } from '../utils/contracts';

// ── Helper ─────────────────────────────────────────────────────

function useContract(address: string | undefined, abi: any[]) {
  const { provider } = useWallet();
  return useMemo(() => {
    if (!provider || !address) return null;
    return new ethers.Contract(address, abi, provider);
  }, [provider, address, abi]);
}

// ── Individual contract hooks ──────────────────────────────────

export function usePolicyEngine() {
  return useContract(DEPLOYED_ADDRESSES.policyEngine, ABIS.PolicyEngine);
}

export function useTreasuryFirewall() {
  return useContract(DEPLOYED_ADDRESSES.treasuryFirewall, ABIS.TreasuryFirewall);
}

export function useTreasury() {
  return useContract(DEPLOYED_ADDRESSES.treasury, ABIS.Treasury);
}

export function useMockUSDC() {
  return useContract(DEPLOYED_ADDRESSES.mockUSDC, ABIS.MockUSDC);
}

export function usePolicyRegistry() {
  return useContract(DEPLOYED_ADDRESSES.policyRegistry, ABIS.PolicyRegistry);
}

// ── Policy contract hooks ──────────────────────────────────────

export function useSpendingLimitPolicy() {
  return useContract(DEPLOYED_ADDRESSES.spendingLimitPolicy, ABIS.SpendingLimitPolicy);
}

export function useWhitelistPolicy() {
  return useContract(DEPLOYED_ADDRESSES.whitelistPolicy, ABIS.WhitelistPolicy);
}

export function useTimelockPolicy() {
  return useContract(DEPLOYED_ADDRESSES.timelockPolicy, ABIS.TimelockPolicy);
}

export function useMultiSigPolicy() {
  return useContract(DEPLOYED_ADDRESSES.multiSigPolicy, ABIS.MultiSigPolicy);
}

export function useRiskScorePolicy() {
  return useContract(DEPLOYED_ADDRESSES.riskScorePolicy, ABIS.RiskScorePolicy);
}
