import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { DEPLOYED_ADDRESSES, ABIS, shortenAddress } from '../utils/contracts';

const FirewallStatus: React.FC = () => {
  const { provider, address } = useWallet();
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [txPending, setTxPending] = useState(false);
  const [metrics, setMetrics] = useState({
    totalScreened: 0,
    totalPassed: 0,
    totalBlocked: 0,
    isPaused: false,
    isOwner: false,
    policyEngineAddr: '',
    policyEnginePaused: false,
    treasuryPaused: false,
    vaultAuthorized: false,
    policyCount: 0,
  });

  const fetchMetrics = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const fw = new ethers.Contract(DEPLOYED_ADDRESSES.treasuryFirewall, ABIS.TreasuryFirewall, provider);
      const pe = new ethers.Contract(DEPLOYED_ADDRESSES.policyEngine, ABIS.PolicyEngine, provider);
      const treasury = new ethers.Contract(DEPLOYED_ADDRESSES.treasury, ABIS.Treasury, provider);

      const [screened, passed, blocked, fwPaused, fwOwner, peAddr, pePaused, tPaused, vaultAuth, policies] = await Promise.all([
        fw.totalScreened(),
        fw.totalPassed(),
        fw.totalBlocked(),
        fw.paused(),
        fw.owner(),
        fw.policyEngine(),
        pe.paused(),
        treasury.paused(),
        fw.isVaultAuthorized(DEPLOYED_ADDRESSES.treasury),
        pe.getVaultPolicies(DEPLOYED_ADDRESSES.treasury).catch(() => []),
      ]);

      setMetrics({
        totalScreened: Number(screened),
        totalPassed: Number(passed),
        totalBlocked: Number(blocked),
        isPaused: fwPaused,
        isOwner: address ? fwOwner.toLowerCase() === address.toLowerCase() : false,
        policyEngineAddr: peAddr,
        policyEnginePaused: pePaused,
        treasuryPaused: tPaused,
        vaultAuthorized: vaultAuth,
        policyCount: policies.length,
      });
    } catch (err) {
      console.error('FirewallStatus fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [provider, address]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const handleEmergencyToggle = async () => {
    if (!provider || !showConfirm) {
      setShowConfirm(true);
      return;
    }
    setTxPending(true);
    try {
      const signer = await provider.getSigner();
      const pe = new ethers.Contract(DEPLOYED_ADDRESSES.policyEngine, ABIS.PolicyEngine, signer);
      const tx = metrics.policyEnginePaused ? await pe.unpause() : await pe.pause();
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

  const passRate = metrics.totalScreened > 0
    ? ((metrics.totalPassed / metrics.totalScreened) * 100).toFixed(1)
    : '100.0';

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: 'var(--text-secondary)' }}>Reading firewall state...</p>
        </div>
      </div>
    );
  }

  const systemOk = !metrics.isPaused && !metrics.policyEnginePaused && !metrics.treasuryPaused;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Firewall Status</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Live system health from Arbitrum Sepolia
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchMetrics} style={{ padding: '8px 16px' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Hero */}
      <div className="firewall-hero">
        <div className={`firewall-shield ${systemOk ? 'active' : 'paused'}`}>
          <div className="shield-icon">🛡</div>
          <div className="shield-pulse" />
        </div>
        <h2 className="firewall-title">
          {systemOk ? 'Firewall Active' : '⚠️ System Alert'}
        </h2>
        <p className="firewall-subtitle">
          {systemOk
            ? 'All treasury transactions are being screened in real-time on Arbitrum Sepolia'
            : 'One or more components are paused. Check system health below.'}
        </p>
        <div className={`firewall-status-badge ${systemOk ? 'active' : 'paused'}`}>
          <span className="status-dot" />
          {systemOk ? 'OPERATIONAL' : 'DEGRADED'}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginTop: '32px' }}>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{metrics.totalScreened}</div>
          <div className="stat-label">Total Screened</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{metrics.totalPassed}</div>
          <div className="stat-label">Passed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚫</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{metrics.totalBlocked}</div>
          <div className="stat-label">Blocked</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-value">{passRate}%</div>
          <div className="stat-label">Pass Rate</div>
        </div>
      </div>

      {/* System Health */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">System Health</h3>
          <span className={`badge ${systemOk ? 'badge-success' : 'badge-danger'}`}>
            {systemOk ? 'All Systems Go' : 'Issues Detected'}
          </span>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <div className="health-grid">
            <HealthRow label="TreasuryFirewall" value={metrics.isPaused ? 'PAUSED' : 'Active'} status={metrics.isPaused ? 'critical' : 'good'} />
            <HealthRow label="PolicyEngine" value={metrics.policyEnginePaused ? 'PAUSED' : 'Active'} status={metrics.policyEnginePaused ? 'critical' : 'good'} />
            <HealthRow label="Treasury" value={metrics.treasuryPaused ? 'PAUSED' : 'Active'} status={metrics.treasuryPaused ? 'critical' : 'good'} />
            <HealthRow label="Vault Authorized" value={metrics.vaultAuthorized ? 'Yes' : 'No'} status={metrics.vaultAuthorized ? 'good' : 'critical'} />
            <HealthRow label="Active Policies" value={metrics.policyCount.toString()} status={metrics.policyCount > 0 ? 'good' : 'warning'} />
            <HealthRow label="Connected as Owner" value={metrics.isOwner ? 'Yes ✅' : 'No (read-only)'} status={metrics.isOwner ? 'good' : 'warning'} />
          </div>
        </div>
      </div>

      {/* Contract Addresses */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Deployed Contracts</h3>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          {Object.entries(DEPLOYED_ADDRESSES).filter(([, v]) => v).map(([key, addr]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{key}</span>
              <a
                href={`https://sepolia.arbiscan.io/address/${addr}#code`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--primary)' }}
              >
                {shortenAddress(addr)} ↗
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction Flow */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Transaction Flow</h3>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <div className="flow-diagram">
            <FlowStep icon="💰" label="Treasury" desc="Initiates transfer" />
            <FlowArrow />
            <FlowStep icon="🛡" label="Firewall" desc="Screens transaction" active />
            <FlowArrow />
            <FlowStep icon="⚙️" label="Policy Engine" desc="Validates all rules" />
            <FlowArrow />
            <FlowStep icon="📋" label={`${metrics.policyCount} Policies`} desc="Module checks" />
            <FlowArrow />
            <FlowStep icon="✅" label="Execute" desc="Or block & revert" />
          </div>
        </div>
      </div>

      {/* Emergency Controls */}
      {metrics.isOwner && (
        <div className="card" style={{ marginTop: '24px', borderColor: 'var(--danger)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--danger)' }}>⚠️ Emergency Controls</h3>
          </div>
          <div style={{ padding: '0 24px 24px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
              {metrics.policyEnginePaused
                ? 'PolicyEngine is paused. All transactions will be blocked. Click to resume.'
                : 'Pause the PolicyEngine to block ALL treasury transactions immediately.'}
            </p>

            {showConfirm && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠️ Confirm on-chain transaction</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                  This will send a real transaction to Arbitrum Sepolia to {metrics.policyEnginePaused ? 'unpause' : 'pause'} the PolicyEngine.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className={`btn ${metrics.policyEnginePaused ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleEmergencyToggle}
                disabled={txPending}
              >
                {txPending ? '⏳ Sending tx...' : showConfirm ? '✅ Confirm' : metrics.policyEnginePaused ? '🟢 Unpause PolicyEngine' : '🔴 Emergency Pause'}
              </button>
              {showConfirm && (
                <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HealthRow: React.FC<{ label: string; value: string; status: 'good' | 'warning' | 'critical' }> = ({ label, value, status }) => {
  const colors = { good: 'var(--success)', warning: 'var(--warning)', critical: 'var(--danger)' };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color: colors[status], fontWeight: 600 }}>{value}</span>
    </div>
  );
};

const FlowStep: React.FC<{ icon: string; label: string; desc: string; active?: boolean }> = ({ icon, label, desc, active }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px',
    background: active ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-primary)',
    borderRadius: '12px', border: active ? '1px solid var(--primary)' : '1px solid var(--border)', minWidth: '100px',
  }}>
    <span style={{ fontSize: '28px' }}>{icon}</span>
    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{label}</span>
    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>{desc}</span>
  </div>
);

const FlowArrow: React.FC = () => (
  <div style={{ color: 'var(--text-muted)', fontSize: '20px', display: 'flex', alignItems: 'center' }}>→</div>
);

export default FirewallStatus;
