import { useMemo } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { DEPLOYED_ADDRESSES, ABIS } from '../utils/contracts';

// ── Individual contract hooks ──────────────────────────────────

export function usePolicyEngine() {
  const { signer, provider } = useWallet();
  return useMemo(() => {
    const signerOrProvider = signer || provider;
    if (!signerOrProvider || !DEPLOYED_ADDRESSES.policyEngine) return null;
    return new ethers.Contract(
      DEPLOYED_ADDRESSES.policyEngine,
      ABIS.PolicyEngine,
      signerOrProvider
    );
  }, [signer, provider]);
}

export function useTreasuryFirewall() {
  const { signer, provider } = useWallet();
  return useMemo(() => {
    const signerOrProvider = signer || provider;
    if (!signerOrProvider || !DEPLOYED_ADDRESSES.treasuryFirewall) return null;
    return new ethers.Contract(
      DEPLOYED_ADDRESSES.treasuryFirewall,
      ABIS.TreasuryFirewall,
      signerOrProvider
    );
  }, [signer, provider]);
}

export function useTreasury() {
  const { signer, provider } = useWallet();
  return useMemo(() => {
    const signerOrProvider = signer || provider;
    if (!signerOrProvider || !DEPLOYED_ADDRESSES.treasury) return null;
    return new ethers.Contract(
      DEPLOYED_ADDRESSES.treasury,
      ABIS.Treasury,
      signerOrProvider
    );
  }, [signer, provider]);
}

export function useMockUSDC() {
  const { signer, provider } = useWallet();
  return useMemo(() => {
    const signerOrProvider = signer || provider;
    if (!signerOrProvider || !DEPLOYED_ADDRESSES.mockUSDC) return null;
    return new ethers.Contract(
      DEPLOYED_ADDRESSES.mockUSDC,
      ABIS.MockUSDC,
      signerOrProvider
    );
  }, [signer, provider]);
}

export function usePolicyRegistry() {
  const { signer, provider } = useWallet();
  return useMemo(() => {
    const signerOrProvider = signer || provider;
    if (!signerOrProvider || !DEPLOYED_ADDRESSES.policyRegistry) return null;
    return new ethers.Contract(
      DEPLOYED_ADDRESSES.policyRegistry,
      ABIS.PolicyRegistry,
      signerOrProvider
    );
  }, [signer, provider]);
}

// ── Policy contract hooks ──────────────────────────────────────

export function useSpendingLimitPolicy() {
  const { signer, provider } = useWallet();
  return useMemo(() => {
    const signerOrProvider = signer || provider;
    if (!signerOrProvider || !DEPLOYED_ADDRESSES.spendingLimitPolicy) return null;
    return new ethers.Contract(
      DEPLOYED_ADDRESSES.spendingLimitPolicy,
      ABIS.SpendingLimitPolicy,
      signerOrProvider
    );
  }, [signer, provider]);
}

export function useWhitelistPolicy() {
  const { signer, provider } = useWallet();
  return useMemo(() => {
    const signerOrProvider = signer || provider;
    if (!signerOrProvider || !DEPLOYED_ADDRESSES.whitelistPolicy) return null;
    return new ethers.Contract(
      DEPLOYED_ADDRESSES.whitelistPolicy,
      ABIS.WhitelistPolicy,
      signerOrProvider
    );
  }, [signer, provider]);
}

export function useTimelockPolicy() {
  const { signer, provider } = useWallet();
  return useMemo(() => {
    const signerOrProvider = signer || provider;
    if (!signerOrProvider || !DEPLOYED_ADDRESSES.timelockPolicy) return null;
    return new ethers.Contract(
      DEPLOYED_ADDRESSES.timelockPolicy,
      ABIS.TimelockPolicy,
      signerOrProvider
    );
  }, [signer, provider]);
}

export function useMultiSigPolicy() {
  const { signer, provider } = useWallet();
  return useMemo(() => {
    const signerOrProvider = signer || provider;
    if (!signerOrProvider || !DEPLOYED_ADDRESSES.multiSigPolicy) return null;
    return new ethers.Contract(
      DEPLOYED_ADDRESSES.multiSigPolicy,
      ABIS.MultiSigPolicy,
      signerOrProvider
    );
  }, [signer, provider]);
}

export function useRiskScorePolicy() {
  const { signer, provider } = useWallet();
  return useMemo(() => {
    const signerOrProvider = signer || provider;
    if (!signerOrProvider || !DEPLOYED_ADDRESSES.riskScorePolicy) return null;
    return new ethers.Contract(
      DEPLOYED_ADDRESSES.riskScorePolicy,
      ABIS.RiskScorePolicy,
      signerOrProvider
    );
  }, [signer, provider]);
}
