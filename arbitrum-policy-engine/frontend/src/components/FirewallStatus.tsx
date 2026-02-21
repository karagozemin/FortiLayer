import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { DEPLOYED_ADDRESSES, ABIS, shortenAddress } from '../utils/contracts';
import {
  IconRefresh, IconExternalLink, IconShield, IconEngine,
  IconTreasury, IconArrowRight, IconPolicy, IconCheck,
} from './Icons';

const FirewallStatus: React.FC = () => {
  const { provider, address } = useWallet();
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [m, setM] = useState({
    totalScreened: 0, totalPassed: 0, totalBlocked: 0,
    isPaused: false, isOwner: false, peAddr: '',
    pePaused: false, tPaused: false, vaultAuth: false, policyCount: 0,
  });

  const fetchMetrics = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const fw = new ethers.Contract(DEPLOYED_ADDRESSES.treasuryFirewall, ABIS.TreasuryFirewall, provider);
      const pe = new ethers.Contract(DEPLOYED_ADDRESSES.policyEngine, ABIS.PolicyEngine, provider);
      const treasury = new ethers.Contract(DEPLOYED_ADDRESSES.treasury, ABIS.Treasury, provider);

      const [screened, passed, blocked, fwPaused, fwOwner, peAddr, pePaused, tPaused, vaultAuth, policies] = await Promise.all([
        fw.totalScreened(), fw.totalPassed(), fw.totalBlocked(),
        fw.paused(), fw.owner(), fw.policyEngine(),
        pe.paused(), treasury.paused(),
        fw.isVaultAuthorized(DEPLOYED_ADDRESSES.treasury),
        pe.getVaultPolicies(DEPLOYED_ADDRESSES.treasury).catch(() => []),
      ]);

      setM({
        totalScreened: Number(screened), totalPassed: Number(passed), totalBlocked: Number(blocked),
        isPaused: fwPaused, isOwner: address ? fwOwner.toLowerCase() === address.toLowerCase() : false,
        peAddr, pePaused, tPaused, vaultAuth, policyCount: policies.length,
      });
    } catch (err) {
      console.error('FirewallStatus error:', err);
    } finally {
      setLoading(false);
    }
  }, [provider, address]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const handleEmergencyToggle = async () => {
    if (!provider || !showConfirm) { setShowConfirm(true); return; }
    setTxPending(true);
    try {
      const signer = await provider.getSigner();
      const pe = new ethers.Contract(DEPLOYED_ADDRESSES.policyEngine, ABIS.PolicyEngine, signer);
      const tx = m.pePaused ? await pe.unpause() : await pe.pause();
      await tx.wait();
      setShowConfirm(false);
      await fetchMetrics();
    } catch (err: any) {
      console.error('Emergency toggle error:', err);
      alert(err?.reason || err?.message || 'Transaction failed');
    } finally {
      setTxPending(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /><p>Reading firewall state…</p></div>;
  }

  const systemOk = !m.isPaused && !m.pePaused && !m.tPaused;
  const passRate = m.totalScreened > 0 ? ((m.totalPassed / m.totalScreened) * 100).toFixed(1) : '100.0';

  return (
    <>
      {/* Hero */}
      <div className="fw-hero">
        <div className="shield-glow"><IconShield /></div>
        <h2>{systemOk ? 'Firewall Operational' : 'System Alert'}</h2>
        <p>
          {systemOk
            ? 'All treasury transactions are being screened in real-time'
            : 'One or more components are paused — check system health'}
        </p>
        <div className={`status-badge ${systemOk ? 'ok' : 'warn'}`}>
          <span className="pulse" />
          {systemOk ? 'OPERATIONAL' : 'DEGRADED'}
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics">
        <div className="metric m-cyan">
          <div className="metric-label">Screened</div>
          <div className="metric-value">{m.totalScreened}</div>
        </div>
        <div className="metric m-green">
          <div className="metric-label">Passed</div>
          <div className="metric-value" style={{ color: 'var(--green)' }}>{m.totalPassed}</div>
        </div>
        <div className="metric m-red">
          <div className="metric-label">Blocked</div>
          <div className="metric-value" style={{ color: m.totalBlocked > 0 ? 'var(--red)' : undefined }}>{m.totalBlocked}</div>
        </div>
        <div className="metric m-blue">
          <div className="metric-label">Pass Rate</div>
          <div className="metric-value">{passRate}%</div>
        </div>
      </div>

      <div className="grid-2">
        {/* System Health */}
        <div className="card">
          <div className="card-head">
            <h3>System Health</h3>
            <span className={`chip ${systemOk ? 'chip-green' : 'chip-red'}`}>
              {systemOk ? 'All OK' : 'Issues'}
            </span>
          </div>
          <div className="card-body">
            <HealthRow label="TreasuryFirewall" value={m.isPaused ? 'PAUSED' : 'Active'} ok={!m.isPaused} />
            <HealthRow label="PolicyEngine" value={m.pePaused ? 'PAUSED' : 'Active'} ok={!m.pePaused} />
            <HealthRow label="Treasury" value={m.tPaused ? 'PAUSED' : 'Active'} ok={!m.tPaused} />
            <HealthRow label="Vault Authorized" value={m.vaultAuth ? 'Yes' : 'No'} ok={m.vaultAuth} />
            <HealthRow label="Active Policies" value={m.policyCount.toString()} ok={m.policyCount > 0} />
            <HealthRow label="Connected as Owner" value={m.isOwner ? 'Yes' : 'No'} ok={m.isOwner} />
          </div>
        </div>

        {/* Contracts */}
        <div className="card">
          <div className="card-head">
            <h3>Deployed Contracts</h3>
            <button className="btn" onClick={fetchMetrics}><IconRefresh style={{ width: 14, height: 14 }} /></button>
          </div>
          <div className="card-body">
            {Object.entries(DEPLOYED_ADDRESSES).filter(([, v]) => v).map(([key, addr]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{key}</span>
                <a href={`https://sepolia.arbiscan.io/address/${addr}#code`} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                  {shortenAddress(addr)} <IconExternalLink style={{ width: 10, height: 10 }} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction Flow */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-head"><h3>Transaction Flow</h3></div>
        <div className="card-body">
          <div className="flow">
            <FlowNode icon={<IconTreasury />} label="Treasury" sub="Initiates" />
            <Arrow />
            <FlowNode icon={<IconShield />} label="Firewall" sub="Screens" active />
            <Arrow />
            <FlowNode icon={<IconEngine />} label="Engine" sub="Validates" />
            <Arrow />
            <FlowNode icon={<IconPolicy />} label={`${m.policyCount} Policies`} sub="Checks" />
            <Arrow />
            <FlowNode icon={<IconCheck />} label="Execute" sub="Or revert" />
          </div>
        </div>
      </div>

      {/* Emergency Controls */}
      {m.isOwner && (
        <div className="card" style={{ marginTop: 12, borderColor: 'rgba(239,68,68,.3)' }}>
          <div className="card-head">
            <h3 style={{ color: 'var(--red)' }}>Emergency Controls</h3>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 14 }}>
              {m.pePaused
                ? 'PolicyEngine is currently paused. All transactions are blocked.'
                : 'Pause the PolicyEngine to immediately block all treasury transactions.'}
            </p>

            {showConfirm && (
              <div className="confirm-box">
                <p className="cb-title">Confirm on-chain transaction</p>
                <p className="cb-desc">
                  This will {m.pePaused ? 'unpause' : 'pause'} the PolicyEngine on Arbitrum Sepolia.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`btn ${m.pePaused ? 'btn-blue' : 'btn-red'}`} onClick={handleEmergencyToggle} disabled={txPending}>
                {txPending ? 'Sending…' : showConfirm ? 'Confirm' : m.pePaused ? 'Unpause Engine' : 'Emergency Pause'}
              </button>
              {showConfirm && (
                <button className="btn" onClick={() => setShowConfirm(false)}>Cancel</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const HealthRow: React.FC<{ label: string; value: string; ok: boolean }> = ({ label, value, ok }) => (
  <div className="health-row">
    <span className="h-label">{label}</span>
    <span style={{ fontWeight: 600, color: ok ? 'var(--green)' : 'var(--red)', fontSize: 13 }}>{value}</span>
  </div>
);

const FlowNode: React.FC<{ icon: React.ReactNode; label: string; sub: string; active?: boolean }> = ({ icon, label, sub, active }) => (
  <div className={`flow-node ${active ? 'active' : ''}`}>
    {icon}
    <span className="fn-label">{label}</span>
    <span className="fn-sub">{sub}</span>
  </div>
);

const Arrow: React.FC = () => (
  <span className="flow-arrow">
    <IconArrowRight style={{ width: 16, height: 16 }} />
  </span>
);

export default FirewallStatus;
