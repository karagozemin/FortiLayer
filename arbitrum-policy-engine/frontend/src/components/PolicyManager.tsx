import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { DEPLOYED_ADDRESSES, ABIS, shortenAddress } from '../utils/contracts';
import { IconRefresh, IconExternalLink } from './Icons';

interface PolicyData {
  address: string;
  name: string;
  color: string;
  bgColor: string;
  icon: string;
  active: boolean;
  params: { label: string; value: string }[];
}

const STYLE: Record<string, { icon: string; color: string; bg: string }> = {
  SpendingLimitPolicy: { icon: '⬡', color: 'var(--blue)', bg: 'var(--blue-dim)' },
  WhitelistPolicy:     { icon: '◈', color: 'var(--green)', bg: 'var(--green-dim)' },
  TimelockPolicy:      { icon: '◎', color: 'var(--amber)', bg: 'var(--amber-dim)' },
  MultiSigPolicy:      { icon: '⬢', color: 'var(--purple)', bg: 'var(--purple-dim)' },
  RiskScorePolicy:     { icon: '△', color: 'var(--red)', bg: 'var(--red-dim)' },
};

const PolicyManager: React.FC = () => {
  const { provider } = useWallet();
  const [policies, setPolicies] = useState<PolicyData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const pe = new ethers.Contract(DEPLOYED_ADDRESSES.policyEngine, ABIS.PolicyEngine, provider);
      const vault = DEPLOYED_ADDRESSES.treasury;
      const activePolicies: string[] = await pe.getVaultPolicies(vault);
      const activeSet = new Set(activePolicies.map((a: string) => a.toLowerCase()));

      const res: PolicyData[] = [];

      // SpendingLimit
      if (DEPLOYED_ADDRESSES.spendingLimitPolicy) {
        const c = new ethers.Contract(DEPLOYED_ADDRESSES.spendingLimitPolicy, ABIS.SpendingLimitPolicy, provider);
        const [name, dailyLimit, maxTx, spent, remaining] = await Promise.all([
          c.policyName(), c.defaultDailyLimit(), c.defaultMaxTxAmount(),
          c.getDailySpent(vault), c.getRemainingDailyAllowance(vault),
        ]);
        const s = STYLE.SpendingLimitPolicy;
        res.push({
          address: DEPLOYED_ADDRESSES.spendingLimitPolicy, name,
          color: s.color, bgColor: s.bg, icon: s.icon,
          active: activeSet.has(DEPLOYED_ADDRESSES.spendingLimitPolicy.toLowerCase()),
          params: [
            { label: 'Daily Limit', value: `${ethers.formatUnits(dailyLimit, 6)} USDC` },
            { label: 'Max Per Tx', value: `${ethers.formatUnits(maxTx, 6)} USDC` },
            { label: 'Spent Today', value: `${ethers.formatUnits(spent, 6)} USDC` },
            { label: 'Remaining', value: `${ethers.formatUnits(remaining, 6)} USDC` },
          ],
        });
      }

      // Whitelist
      if (DEPLOYED_ADDRESSES.whitelistPolicy) {
        const c = new ethers.Contract(DEPLOYED_ADDRESSES.whitelistPolicy, ABIS.WhitelistPolicy, provider);
        const [name, list] = await Promise.all([c.policyName(), c.getVaultWhitelist(vault)]);
        const s = STYLE.WhitelistPolicy;
        res.push({
          address: DEPLOYED_ADDRESSES.whitelistPolicy, name,
          color: s.color, bgColor: s.bg, icon: s.icon,
          active: activeSet.has(DEPLOYED_ADDRESSES.whitelistPolicy.toLowerCase()),
          params: [
            { label: 'Whitelisted', value: `${list.length} addresses` },
            ...list.slice(0, 2).map((a: string, i: number) => ({ label: `#${i + 1}`, value: shortenAddress(a) })),
          ],
        });
      }

      // Timelock
      if (DEPLOYED_ADDRESSES.timelockPolicy) {
        const c = new ethers.Contract(DEPLOYED_ADDRESSES.timelockPolicy, ABIS.TimelockPolicy, provider);
        const [name, duration, lastTx, unlockTime, expired] = await Promise.all([
          c.policyName(), c.getEffectiveTimelockDuration(vault),
          c.lastTransactionTime(vault), c.getUnlockTime(vault), c.isTimelockExpired(vault),
        ]);
        const s = STYLE.TimelockPolicy;
        res.push({
          address: DEPLOYED_ADDRESSES.timelockPolicy, name,
          color: s.color, bgColor: s.bg, icon: s.icon,
          active: activeSet.has(DEPLOYED_ADDRESSES.timelockPolicy.toLowerCase()),
          params: [
            { label: 'Cooldown', value: `${Number(duration)}s` },
            { label: 'Last Tx', value: Number(lastTx) === 0 ? 'Never' : new Date(Number(lastTx) * 1000).toLocaleString() },
            { label: 'Unlock', value: Number(unlockTime) === 0 ? 'Now' : new Date(Number(unlockTime) * 1000).toLocaleString() },
            { label: 'Can Transact', value: expired ? 'Yes' : 'Locked' },
          ],
        });
      }

      // MultiSig
      if (DEPLOYED_ADDRESSES.multiSigPolicy) {
        try {
          const c = new ethers.Contract(DEPLOYED_ADDRESSES.multiSigPolicy, ABIS.MultiSigPolicy, provider);
          const [name, signers, required] = await Promise.all([
            c.policyName(), c.getSigners(), c.requiredApprovals(),
          ]);
          const s = STYLE.MultiSigPolicy;
          res.push({
            address: DEPLOYED_ADDRESSES.multiSigPolicy, name,
            color: s.color, bgColor: s.bg, icon: s.icon,
            active: activeSet.has(DEPLOYED_ADDRESSES.multiSigPolicy.toLowerCase()),
            params: [
              { label: 'Required', value: `${Number(required)} of ${signers.length}` },
              { label: 'Signers', value: signers.length.toString() },
            ],
          });
        } catch { /* skip */ }
      }

      // RiskScore
      if (DEPLOYED_ADDRESSES.riskScorePolicy) {
        const c = new ethers.Contract(DEPLOYED_ADDRESSES.riskScorePolicy, ABIS.RiskScorePolicy, provider);
        const [name, threshold, defaultSc, maxScore] = await Promise.all([
          c.policyName(), c.minThreshold(), c.defaultScore(), c.MAX_SCORE(),
        ]);
        const s = STYLE.RiskScorePolicy;
        res.push({
          address: DEPLOYED_ADDRESSES.riskScorePolicy, name,
          color: s.color, bgColor: s.bg, icon: s.icon,
          active: activeSet.has(DEPLOYED_ADDRESSES.riskScorePolicy.toLowerCase()),
          params: [
            { label: 'Threshold', value: `${Number(threshold)} / ${Number(maxScore)}` },
            { label: 'Default Score', value: Number(defaultSc).toString() },
          ],
        });
      }

      setPolicies(res);
    } catch (err) {
      console.error('PolicyManager error:', err);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return <div className="loading"><div className="spinner" /><p>Reading policy state…</p></div>;
  }

  const activeCount = policies.filter(p => p.active).length;

  return (
    <>
      {/* Summary bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
              <strong style={{ color: 'var(--text-0)' }}>{activeCount}</strong> of {policies.length} policies active
            </span>
            <div className="progress" style={{ width: 100 }}>
              <div className="progress-fill" style={{
                width: `${policies.length > 0 ? (activeCount / policies.length) * 100 : 0}%`,
                background: 'var(--blue)',
              }} />
            </div>
          </div>
          <button className="btn" onClick={fetch}><IconRefresh style={{ width: 14, height: 14 }} /> Refresh</button>
        </div>
      </div>

      {/* Policy cards */}
      <div className="policy-grid">
        {policies.map((p) => (
          <div key={p.address} className={`policy-card ${!p.active ? 'inactive' : ''}`}>
            <div className="policy-card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="policy-icon-box" style={{ background: p.bgColor, color: p.color, width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>
                  {p.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-0)' }}>{p.name}</div>
                  <span className={`chip ${p.active ? 'chip-green' : 'chip-amber'}`} style={{ marginTop: 3 }}>
                    {p.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <code style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{shortenAddress(p.address)}</code>
            </div>

            <div className="policy-card-body">
              {p.params.map((param, i) => (
                <div key={i} className="policy-param">
                  <span className="p-label">{param.label}</span>
                  <span className="p-value">{param.value}</span>
                </div>
              ))}
            </div>

            <div className="policy-card-foot">
              <a href={`https://sepolia.arbiscan.io/address/${p.address}#code`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                View on Arbiscan <IconExternalLink style={{ width: 11, height: 11 }} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default PolicyManager;
