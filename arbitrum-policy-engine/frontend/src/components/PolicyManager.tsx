import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { DEPLOYED_ADDRESSES, ABIS, shortenAddress } from '../utils/contracts';

interface PolicyData {
  address: string;
  name: string;
  icon: string;
  color: string;
  active: boolean;
  params: { label: string; value: string }[];
}

const POLICY_META: Record<string, { icon: string; color: string }> = {
  SpendingLimitPolicy: { icon: '💳', color: '#3b82f6' },
  WhitelistPolicy: { icon: '✅', color: '#10b981' },
  TimelockPolicy: { icon: '⏱', color: '#f59e0b' },
  MultiSigPolicy: { icon: '✍️', color: '#8b5cf6' },
  RiskScorePolicy: { icon: '📈', color: '#ef4444' },
};

const PolicyManager: React.FC = () => {
  const { provider } = useWallet();
  const [policies, setPolicies] = useState<PolicyData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolicies = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const pe = new ethers.Contract(DEPLOYED_ADDRESSES.policyEngine, ABIS.PolicyEngine, provider);
      const treasuryAddr = DEPLOYED_ADDRESSES.treasury;

      // Get active policies for the treasury vault
      const activePolicyAddrs: string[] = await pe.getVaultPolicies(treasuryAddr);
      const activeSet = new Set(activePolicyAddrs.map((a: string) => a.toLowerCase()));

      const results: PolicyData[] = [];

      // SpendingLimitPolicy
      if (DEPLOYED_ADDRESSES.spendingLimitPolicy) {
        const c = new ethers.Contract(DEPLOYED_ADDRESSES.spendingLimitPolicy, ABIS.SpendingLimitPolicy, provider);
        const [name, dailyLimit, maxTx, spent, remaining] = await Promise.all([
          c.policyName(),
          c.defaultDailyLimit(),
          c.defaultMaxTxAmount(),
          c.getDailySpent(treasuryAddr),
          c.getRemainingDailyAllowance(treasuryAddr),
        ]);
        results.push({
          address: DEPLOYED_ADDRESSES.spendingLimitPolicy,
          name,
          ...POLICY_META.SpendingLimitPolicy,
          active: activeSet.has(DEPLOYED_ADDRESSES.spendingLimitPolicy.toLowerCase()),
          params: [
            { label: 'Daily Limit', value: `${ethers.formatUnits(dailyLimit, 6)} USDC` },
            { label: 'Max Per Tx', value: `${ethers.formatUnits(maxTx, 6)} USDC` },
            { label: 'Spent Today', value: `${ethers.formatUnits(spent, 6)} USDC` },
            { label: 'Remaining', value: `${ethers.formatUnits(remaining, 6)} USDC` },
          ],
        });
      }

      // WhitelistPolicy
      if (DEPLOYED_ADDRESSES.whitelistPolicy) {
        const c = new ethers.Contract(DEPLOYED_ADDRESSES.whitelistPolicy, ABIS.WhitelistPolicy, provider);
        const [name, vaultList] = await Promise.all([
          c.policyName(),
          c.getVaultWhitelist(treasuryAddr),
        ]);
        results.push({
          address: DEPLOYED_ADDRESSES.whitelistPolicy,
          name,
          ...POLICY_META.WhitelistPolicy,
          active: activeSet.has(DEPLOYED_ADDRESSES.whitelistPolicy.toLowerCase()),
          params: [
            { label: 'Whitelisted Addresses', value: vaultList.length.toString() },
            ...vaultList.slice(0, 3).map((a: string, i: number) => ({
              label: `Address #${i + 1}`,
              value: shortenAddress(a),
            })),
          ],
        });
      }

      // TimelockPolicy
      if (DEPLOYED_ADDRESSES.timelockPolicy) {
        const c = new ethers.Contract(DEPLOYED_ADDRESSES.timelockPolicy, ABIS.TimelockPolicy, provider);
        const [name, duration, lastTx, unlockTime, isExpired] = await Promise.all([
          c.policyName(),
          c.getEffectiveTimelockDuration(treasuryAddr),
          c.lastTransactionTime(treasuryAddr),
          c.getUnlockTime(treasuryAddr),
          c.isTimelockExpired(treasuryAddr),
        ]);
        results.push({
          address: DEPLOYED_ADDRESSES.timelockPolicy,
          name,
          ...POLICY_META.TimelockPolicy,
          active: activeSet.has(DEPLOYED_ADDRESSES.timelockPolicy.toLowerCase()),
          params: [
            { label: 'Cooldown Period', value: `${Number(duration)} seconds` },
            { label: 'Last Tx Time', value: Number(lastTx) === 0 ? 'Never' : new Date(Number(lastTx) * 1000).toLocaleString() },
            { label: 'Unlock Time', value: Number(unlockTime) === 0 ? 'Now' : new Date(Number(unlockTime) * 1000).toLocaleString() },
            { label: 'Can Transact', value: isExpired ? '✅ Yes' : '❌ Locked' },
          ],
        });
      }

      // MultiSigPolicy (may not be deployed)
      if (DEPLOYED_ADDRESSES.multiSigPolicy) {
        try {
          const c = new ethers.Contract(DEPLOYED_ADDRESSES.multiSigPolicy, ABIS.MultiSigPolicy, provider);
          const [name, signers, required] = await Promise.all([
            c.policyName(),
            c.getSigners(),
            c.requiredApprovals(),
          ]);
          results.push({
            address: DEPLOYED_ADDRESSES.multiSigPolicy,
            name,
            ...POLICY_META.MultiSigPolicy,
            active: activeSet.has(DEPLOYED_ADDRESSES.multiSigPolicy.toLowerCase()),
            params: [
              { label: 'Required Sigs', value: `${Number(required)} of ${signers.length}` },
              { label: 'Total Signers', value: signers.length.toString() },
            ],
          });
        } catch { /* not deployed */ }
      }

      // RiskScorePolicy
      if (DEPLOYED_ADDRESSES.riskScorePolicy) {
        const c = new ethers.Contract(DEPLOYED_ADDRESSES.riskScorePolicy, ABIS.RiskScorePolicy, provider);
        const [name, threshold, defaultSc, maxScore] = await Promise.all([
          c.policyName(),
          c.minThreshold(),
          c.defaultScore(),
          c.MAX_SCORE(),
        ]);
        results.push({
          address: DEPLOYED_ADDRESSES.riskScorePolicy,
          name,
          ...POLICY_META.RiskScorePolicy,
          active: activeSet.has(DEPLOYED_ADDRESSES.riskScorePolicy.toLowerCase()),
          params: [
            { label: 'Min Threshold', value: `${Number(threshold)} / ${Number(maxScore)}` },
            { label: 'Default Score', value: Number(defaultSc).toString() },
            { label: 'Max Score', value: Number(maxScore).toString() },
          ],
        });
      }

      setPolicies(results);
    } catch (err) {
      console.error('PolicyManager fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: 'var(--text-secondary)' }}>Reading policy state from chain...</p>
        </div>
      </div>
    );
  }

  const activeCount = policies.filter(p => p.active).length;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Policy Manager</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Live policy state from Arbitrum Sepolia
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchPolicies} style={{ padding: '8px 16px' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{activeCount}</strong> of {policies.length} policies active on treasury vault
          </span>
          <div style={{ height: '8px', width: '120px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${policies.length > 0 ? (activeCount / policies.length) * 100 : 0}%`, background: 'var(--primary)', borderRadius: '4px' }} />
          </div>
        </div>
      </div>

      {/* Policy Cards */}
      <div className="policy-grid">
        {policies.map((policy) => (
          <div key={policy.address} className={`policy-card ${!policy.active ? 'inactive' : ''}`}>
            <div className="policy-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: `${policy.color}20`,
                  color: policy.color,
                  width: '48px', height: '48px', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                }}>
                  {policy.icon}
                </div>
                <div>
                  <h3 className="policy-card-title">{policy.name}</h3>
                  <span className={`badge ${policy.active ? 'badge-success' : 'badge-warning'}`} style={{ marginTop: '4px' }}>
                    {policy.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {shortenAddress(policy.address)}
              </code>
            </div>

            <div className="policy-params">
              {policy.params.map((param, idx) => (
                <div key={idx} className="policy-param">
                  <span className="param-label">{param.label}</span>
                  <span className="param-value">{param.value}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <a
                href={`https://sepolia.arbiscan.io/address/${policy.address}#code`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--primary)', fontSize: '12px' }}
              >
                View on Arbiscan ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PolicyManager;
