import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { DEPLOYED_ADDRESSES, ABIS, shortenAddress, parseContractError } from '../utils/contracts';
import {
  IconRefresh, IconExternalLink, IconShield, IconEngine,
  IconTreasury, IconArrowRight, IconPolicy, IconCheck,
} from './Icons';
import { useToast } from './Toast';

const FirewallStatus: React.FC = () => {
  const { provider, address } = useWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [txPending, setTxPending] = useState('');
  const [m, setM] = useState({
    totalScreened: 0, totalPassed: 0, totalBlocked: 0,
    isPaused: false, isOwner: false, peAddr: '',
    pePaused: false, tPaused: false, vaultAuth: false, policyCount: 0,
    peOwner: false, tOwner: false,
  });

  const fetchMetrics = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const fw = new ethers.Contract(DEPLOYED_ADDRESSES.treasuryFirewall, ABIS.TreasuryFirewall, provider);
      const pe = new ethers.Contract(DEPLOYED_ADDRESSES.policyEngine, ABIS.PolicyEngine, provider);
      const treasury = new ethers.Contract(DEPLOYED_ADDRESSES.treasury, ABIS.Treasury, provider);

      const userAddr = address?.toLowerCase() || '';

      const [screened, passed, blocked, fwPaused, fwOwner, peAddr, pePaused, peOwnerAddr, tPaused, tHasAdmin, vaultAuth, policies] = await Promise.all([
        fw.totalScreened(), fw.totalPassed(), fw.totalBlocked(),
        fw.paused(), fw.owner(), fw.policyEngine(),
        pe.paused(), pe.owner(),
        treasury.paused(),
        userAddr
          ? treasury.hasRole(await treasury.DEFAULT_ADMIN_ROLE(), userAddr).catch(() => false)
          : Promise.resolve(false),
        fw.isVaultAuthorized(DEPLOYED_ADDRESSES.treasury),
        pe.getVaultPolicies(DEPLOYED_ADDRESSES.treasury).catch(() => []),
      ]);

      setM({
        totalScreened: Number(screened), totalPassed: Number(passed), totalBlocked: Number(blocked),
        isPaused: fwPaused, isOwner: userAddr ? fwOwner.toLowerCase() === userAddr : false,
        peAddr, pePaused, tPaused, vaultAuth, policyCount: policies.length,
        peOwner: userAddr ? peOwnerAddr.toLowerCase() === userAddr : false,
        tOwner: !!tHasAdmin,
      });
    } catch (err) {
      console.error('FirewallStatus error:', err);
    } finally {
      setLoading(false);
    }
  }, [provider, address]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const handleTogglePE = async () => {
    if (!provider) return;
    if (showConfirm !== 'pe') { setShowConfirm('pe'); return; }
    setTxPending('pe');
    try {
      const signer = await provider.getSigner();
      const signerAddr = await signer.getAddress();
      const peRead = new ethers.Contract(DEPLOYED_ADDRESSES.policyEngine, ABIS.PolicyEngine, provider);
      const ownerAddr = await peRead.owner();
      if (ownerAddr.toLowerCase() !== signerAddr.toLowerCase()) {
        throw new Error('You are not the owner of the PolicyEngine contract.');
      }
      const pe = new ethers.Contract(DEPLOYED_ADDRESSES.policyEngine, ABIS.PolicyEngine, signer);
      const action = m.pePaused ? 'unpause' : 'pause';
      toast('pending', `${action === 'pause' ? 'Pausing' : 'Unpausing'} PolicyEngine…`);
      const tx = m.pePaused ? await pe.unpause() : await pe.pause();
      await tx.wait();
      toast('success', `PolicyEngine ${action}d`);
      setShowConfirm(null);
      await fetchMetrics();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

  const handleToggleFW = async () => {
    if (!provider) return;
    if (showConfirm !== 'fw') { setShowConfirm('fw'); return; }
    setTxPending('fw');
    try {
      const signer = await provider.getSigner();
      const signerAddr = await signer.getAddress();
      const fwRead = new ethers.Contract(DEPLOYED_ADDRESSES.treasuryFirewall, ABIS.TreasuryFirewall, provider);
      const ownerAddr = await fwRead.owner();
      if (ownerAddr.toLowerCase() !== signerAddr.toLowerCase()) {
        throw new Error('You are not the owner of the TreasuryFirewall contract.');
      }
      const fw = new ethers.Contract(DEPLOYED_ADDRESSES.treasuryFirewall, ABIS.TreasuryFirewall, signer);
      const action = m.isPaused ? 'unpause' : 'pause';
      toast('pending', `${action === 'pause' ? 'Pausing' : 'Unpausing'} Firewall…`);
      const tx = m.isPaused ? await fw.unpause() : await fw.pause();
      await tx.wait();
      toast('success', `TreasuryFirewall ${action}d`);
      setShowConfirm(null);
      await fetchMetrics();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

  const handleToggleTreasury = async () => {
    if (!provider) return;
    if (showConfirm !== 'treasury') { setShowConfirm('treasury'); return; }
    setTxPending('treasury');
    try {
      const signer = await provider.getSigner();
      const signerAddr = await signer.getAddress();
      const treasuryRead = new ethers.Contract(DEPLOYED_ADDRESSES.treasury, ABIS.Treasury, provider);
      // Treasury uses AccessControl: emergencyPause needs PAUSER_ROLE, emergencyUnpause needs ADMIN_ROLE
      const requiredRole = m.tPaused
        ? await treasuryRead.ADMIN_ROLE()
        : await treasuryRead.PAUSER_ROLE();
      const hasRole = await treasuryRead.hasRole(requiredRole, signerAddr);
      if (!hasRole) {
        const roleName = m.tPaused ? 'ADMIN_ROLE' : 'PAUSER_ROLE';
        throw new Error(`You do not have the ${roleName} on the Treasury contract.`);
      }
      const treasury = new ethers.Contract(DEPLOYED_ADDRESSES.treasury, ABIS.Treasury, signer);
      const action = m.tPaused ? 'emergencyUnpause' : 'emergencyPause';
      toast('pending', `${m.tPaused ? 'Unpausing' : 'Pausing'} Treasury…`);
      const tx = m.tPaused ? await treasury.emergencyUnpause() : await treasury.emergencyPause();
      await tx.wait();
      toast('success', `Treasury ${m.tPaused ? 'unpaused' : 'paused'}`);
      setShowConfirm(null);
      await fetchMetrics();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /><p>Reading firewall state…</p></div>;
  }

  const systemOk = !m.isPaused && !m.pePaused && !m.tPaused;
  const passRate = m.totalScreened > 0 ? ((m.totalPassed / m.totalScreened) * 100).toFixed(1) : '100.0';
  const canControl = m.isOwner || m.peOwner || m.tOwner;

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
            <HealthRow label="Connected as Owner" value={canControl ? 'Yes' : 'No'} ok={canControl} />
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
      {canControl && (
        <div className="card" style={{ marginTop: 12, borderColor: 'rgba(239,68,68,.3)' }}>
          <div className="card-head">
            <h3 style={{ color: 'var(--red)' }}>Emergency Controls</h3>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 14 }}>
              Toggle pause state for each contract. Paused contracts will reject all transactions.
            </p>

            {showConfirm && (
              <div className="confirm-box" style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,.2)' }}>
                <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--red)', marginBottom: 4 }}>Confirm on-chain transaction</p>
                <p style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  {showConfirm === 'pe' && `This will ${m.pePaused ? 'unpause' : 'pause'} the PolicyEngine.`}
                  {showConfirm === 'fw' && `This will ${m.isPaused ? 'unpause' : 'pause'} the TreasuryFirewall.`}
                  {showConfirm === 'treasury' && `This will ${m.tPaused ? 'unpause' : 'pause'} the Treasury.`}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* PolicyEngine */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>PolicyEngine</span>
                  <span className={`chip ${m.pePaused ? 'chip-red' : 'chip-green'}`} style={{ marginLeft: 8 }}>
                    {m.pePaused ? 'Paused' : 'Active'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={`btn ${m.pePaused ? 'btn-blue' : 'btn-red'}`}
                    onClick={handleTogglePE}
                    disabled={!!txPending}
                    style={{ fontSize: 12 }}
                  >
                    {txPending === 'pe' ? 'Sending…' : showConfirm === 'pe' ? 'Confirm' : m.pePaused ? 'Unpause' : 'Pause'}
                  </button>
                  {showConfirm === 'pe' && <button className="btn" onClick={() => setShowConfirm(null)} style={{ fontSize: 12 }}>Cancel</button>}
                </div>
              </div>

              {/* TreasuryFirewall */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>TreasuryFirewall</span>
                  <span className={`chip ${m.isPaused ? 'chip-red' : 'chip-green'}`} style={{ marginLeft: 8 }}>
                    {m.isPaused ? 'Paused' : 'Active'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={`btn ${m.isPaused ? 'btn-blue' : 'btn-red'}`}
                    onClick={handleToggleFW}
                    disabled={!!txPending}
                    style={{ fontSize: 12 }}
                  >
                    {txPending === 'fw' ? 'Sending…' : showConfirm === 'fw' ? 'Confirm' : m.isPaused ? 'Unpause' : 'Pause'}
                  </button>
                  {showConfirm === 'fw' && <button className="btn" onClick={() => setShowConfirm(null)} style={{ fontSize: 12 }}>Cancel</button>}
                </div>
              </div>

              {/* Treasury */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Treasury</span>
                  <span className={`chip ${m.tPaused ? 'chip-red' : 'chip-green'}`} style={{ marginLeft: 8 }}>
                    {m.tPaused ? 'Paused' : 'Active'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={`btn ${m.tPaused ? 'btn-blue' : 'btn-red'}`}
                    onClick={handleToggleTreasury}
                    disabled={!!txPending}
                    style={{ fontSize: 12 }}
                  >
                    {txPending === 'treasury' ? 'Sending…' : showConfirm === 'treasury' ? 'Confirm' : m.tPaused ? 'Unpause' : 'Pause'}
                  </button>
                  {showConfirm === 'treasury' && <button className="btn" onClick={() => setShowConfirm(null)} style={{ fontSize: 12 }}>Cancel</button>}
                </div>
              </div>
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
