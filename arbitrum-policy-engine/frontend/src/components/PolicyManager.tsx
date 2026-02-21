import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { DEPLOYED_ADDRESSES, ABIS, shortenAddress, parseContractError, GAS_OVERRIDES, waitForTx } from '../utils/contracts';
import { IconRefresh, IconExternalLink, IconPlus, IconTrash, IconChevronDown } from './Icons';
import { useToast } from './Toast';

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
  const { toast } = useToast();
  const [policies, setPolicies] = useState<PolicyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [whitelistAddrs, setWhitelistAddrs] = useState<string[]>([]);
  const [openAction, setOpenAction] = useState<string | null>(null);
  const [txPending, setTxPending] = useState('');

  // Form states
  const [wlAddr, setWlAddr] = useState('');
  const [wlRemoveAddr, setWlRemoveAddr] = useState('');
  const [slDailyLimit, setSlDailyLimit] = useState('');
  const [slMaxTx, setSlMaxTx] = useState('');
  const [rsAddr, setRsAddr] = useState('');
  const [rsScore, setRsScore] = useState('');
  const [rsThreshold, setRsThreshold] = useState('');
  const [tlDuration, setTlDuration] = useState('');

  // MultiSig states
  const [msApproveToken, setMsApproveToken] = useState('');
  const [msApproveTo, setMsApproveTo] = useState('');
  const [msApproveAmt, setMsApproveAmt] = useState('');
  const [msSigners, setMsSigners] = useState<string[]>([]);
  const [msRequired, setMsRequired] = useState(0);
  const [msLookupToken, setMsLookupToken] = useState('');
  const [msLookupTo, setMsLookupTo] = useState('');
  const [msLookupAmt, setMsLookupAmt] = useState('');
  const [msLookupResult, setMsLookupResult] = useState<{ hash: string; count: number; enough: boolean; signerApprovals: Record<string, boolean> } | null>(null);
  const [msNewSigner, setMsNewSigner] = useState('');
  const [msNewRequired, setMsNewRequired] = useState('');
  const [msActiveTab, setMsActiveTab] = useState<'approve' | 'status' | 'admin'>('approve');

  const fetchPolicies = useCallback(async () => {
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
        setWhitelistAddrs(list);
        res.push({
          address: DEPLOYED_ADDRESSES.whitelistPolicy, name,
          color: s.color, bgColor: s.bg, icon: s.icon,
          active: activeSet.has(DEPLOYED_ADDRESSES.whitelistPolicy.toLowerCase()),
          params: [
            { label: 'Whitelisted', value: `${list.length} addresses` },
            ...list.slice(0, 3).map((a: string, i: number) => ({ label: `#${i + 1}`, value: shortenAddress(a) })),
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
          const [name, signersList, required] = await Promise.all([
            c.policyName(), c.getSigners(), c.requiredApprovals(),
          ]);
          setMsSigners(signersList);
          setMsRequired(Number(required));
          const s = STYLE.MultiSigPolicy;
          res.push({
            address: DEPLOYED_ADDRESSES.multiSigPolicy, name,
            color: s.color, bgColor: s.bg, icon: s.icon,
            active: activeSet.has(DEPLOYED_ADDRESSES.multiSigPolicy.toLowerCase()),
            params: [
              { label: 'Required', value: `${Number(required)} of ${signersList.length}` },
              ...signersList.map((a: string, i: number) => ({ label: `Signer #${i + 1}`, value: shortenAddress(a) })),
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

  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  // ── Action Handlers ──────────────
  const handleAddWhitelist = async () => {
    if (!provider || !wlAddr) return;
    setTxPending('wl-add');
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESSES.whitelistPolicy, ABIS.WhitelistPolicy, signer);
      toast('pending', 'Adding to whitelist…');
      const tx = await c.addToVaultWhitelist(DEPLOYED_ADDRESSES.treasury, wlAddr, GAS_OVERRIDES);
      await waitForTx(tx);
      toast('success', `Added ${shortenAddress(wlAddr)} to whitelist`);
      setWlAddr('');
      await fetchPolicies();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

  const handleRemoveWhitelist = async (addr: string) => {
    if (!provider) return;
    setTxPending('wl-remove');
    try {
      // Pre-check: verify the address is actually whitelisted
      const wlRead = new ethers.Contract(DEPLOYED_ADDRESSES.whitelistPolicy, ABIS.WhitelistPolicy, provider);
      const isWL = await wlRead.isWhitelisted(DEPLOYED_ADDRESSES.treasury, addr);
      if (!isWL) {
        toast('error', `${shortenAddress(addr)} is not currently whitelisted`);
        setTxPending('');
        return;
      }
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESSES.whitelistPolicy, ABIS.WhitelistPolicy, signer);
      toast('pending', 'Removing from whitelist…');
      const tx = await c.removeFromVaultWhitelist(DEPLOYED_ADDRESSES.treasury, addr, GAS_OVERRIDES);
      await waitForTx(tx);
      toast('success', `Removed ${shortenAddress(addr)} from whitelist`);
      setWlRemoveAddr('');
      await fetchPolicies();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

  const handleSetDailyLimit = async () => {
    if (!provider || !slDailyLimit) return;
    setTxPending('sl-daily');
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESSES.spendingLimitPolicy, ABIS.SpendingLimitPolicy, signer);
      const amt = ethers.parseUnits(slDailyLimit, 6);
      toast('pending', 'Setting daily limit…');
      const tx = await c.setVaultDailyLimit(DEPLOYED_ADDRESSES.treasury, amt, GAS_OVERRIDES);
      await waitForTx(tx);
      toast('success', `Daily limit set to ${slDailyLimit} USDC`);
      setSlDailyLimit('');
      await fetchPolicies();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

  const handleSetMaxTx = async () => {
    if (!provider || !slMaxTx) return;
    setTxPending('sl-max');
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESSES.spendingLimitPolicy, ABIS.SpendingLimitPolicy, signer);
      const amt = ethers.parseUnits(slMaxTx, 6);
      toast('pending', 'Setting max per tx…');
      const tx = await c.setVaultMaxTxAmount(DEPLOYED_ADDRESSES.treasury, amt, GAS_OVERRIDES);
      await waitForTx(tx);
      toast('success', `Max per tx set to ${slMaxTx} USDC`);
      setSlMaxTx('');
      await fetchPolicies();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

  const handleSetRiskScore = async () => {
    if (!provider || !rsAddr || !rsScore) return;
    if (Number(rsScore) > 100 || Number(rsScore) < 0) {
      toast('error', 'Risk score must be between 0 and 100');
      return;
    }
    setTxPending('rs-score');
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESSES.riskScorePolicy, ABIS.RiskScorePolicy, signer);
      toast('pending', 'Setting risk score…');
      const tx = await c.setRiskScore(rsAddr, Number(rsScore), GAS_OVERRIDES);
      await waitForTx(tx);
      toast('success', `Risk score for ${shortenAddress(rsAddr)} set to ${rsScore}`);
      setRsAddr('');
      setRsScore('');
      await fetchPolicies();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

  const handleSetThreshold = async () => {
    if (!provider || !rsThreshold) return;
    if (Number(rsThreshold) > 100 || Number(rsThreshold) < 0) {
      toast('error', 'Threshold must be between 0 and 100');
      return;
    }
    setTxPending('rs-thresh');
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESSES.riskScorePolicy, ABIS.RiskScorePolicy, signer);
      toast('pending', 'Setting min threshold…');
      const tx = await c.setMinThreshold(Number(rsThreshold), GAS_OVERRIDES);
      await waitForTx(tx);
      toast('success', `Min threshold set to ${rsThreshold}`);
      setRsThreshold('');
      await fetchPolicies();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

  const handleSetTimelockDuration = async () => {
    if (!provider || !tlDuration) return;
    setTxPending('tl-dur');
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESSES.timelockPolicy, ABIS.TimelockPolicy, signer);
      toast('pending', 'Setting timelock duration…');
      const tx = await c.setVaultTimelockDuration(DEPLOYED_ADDRESSES.treasury, Number(tlDuration), GAS_OVERRIDES);
      await waitForTx(tx);
      toast('success', `Timelock duration set to ${tlDuration}s`);
      setTlDuration('');
      await fetchPolicies();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

  // ── MultiSig Handlers ──────────────
  const handleMsApprove = async () => {
    if (!provider || !msApproveTo || !msApproveAmt) return;
    setTxPending('ms-approve');
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESSES.multiSigPolicy, ABIS.MultiSigPolicy, signer);
      const token = msApproveToken || DEPLOYED_ADDRESSES.mockUSDC;
      const amt = ethers.parseUnits(msApproveAmt, 6);
      toast('pending', 'Approving transaction…');
      const tx = await c.approveTransaction(DEPLOYED_ADDRESSES.treasury, token, msApproveTo, amt, GAS_OVERRIDES);
      await waitForTx(tx);
      toast('success', 'Transaction approved!');
      await fetchPolicies();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

  const handleMsRevoke = async () => {
    if (!provider || !msApproveTo || !msApproveAmt) return;
    setTxPending('ms-revoke');
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESSES.multiSigPolicy, ABIS.MultiSigPolicy, signer);
      const token = msApproveToken || DEPLOYED_ADDRESSES.mockUSDC;
      const amt = ethers.parseUnits(msApproveAmt, 6);
      toast('pending', 'Revoking approval…');
      const tx = await c.revokeApproval(DEPLOYED_ADDRESSES.treasury, token, msApproveTo, amt, GAS_OVERRIDES);
      await waitForTx(tx);
      toast('success', 'Approval revoked!');
      await fetchPolicies();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

  const handleMsLookup = async () => {
    if (!provider || !msLookupTo || !msLookupAmt) return;
    try {
      const c = new ethers.Contract(DEPLOYED_ADDRESSES.multiSigPolicy, ABIS.MultiSigPolicy, provider);
      const token = msLookupToken || DEPLOYED_ADDRESSES.mockUSDC;
      const amt = ethers.parseUnits(msLookupAmt, 6);
      const txHash = await c.getTransactionHash(DEPLOYED_ADDRESSES.treasury, token, msLookupTo, amt);
      const [count, enough] = await Promise.all([
        c.approvalCount(txHash), c.hasEnoughApprovals(txHash),
      ]);
      // Check each signer
      const signerApprovals: Record<string, boolean> = {};
      for (const s of msSigners) {
        signerApprovals[s] = await c.approvals(txHash, s);
      }
      setMsLookupResult({ hash: txHash, count: Number(count), enough, signerApprovals });
    } catch (err: any) {
      toast('error', parseContractError(err));
    }
  };

  const handleMsAddSigner = async () => {
    if (!provider || !msNewSigner) return;
    setTxPending('ms-add-signer');
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESSES.multiSigPolicy, ABIS.MultiSigPolicy, signer);
      toast('pending', 'Adding signer…');
      const tx = await c.addSigner(msNewSigner, GAS_OVERRIDES);
      await waitForTx(tx);
      toast('success', `Added signer ${shortenAddress(msNewSigner)}`);
      setMsNewSigner('');
      await fetchPolicies();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

  const handleMsRemoveSigner = async (addr: string) => {
    if (!provider) return;
    setTxPending('ms-rm-signer');
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESSES.multiSigPolicy, ABIS.MultiSigPolicy, signer);
      toast('pending', `Removing signer ${shortenAddress(addr)}…`);
      const tx = await c.removeSigner(addr, GAS_OVERRIDES);
      await waitForTx(tx);
      toast('success', `Removed signer ${shortenAddress(addr)}`);
      await fetchPolicies();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

  const handleMsSetRequired = async () => {
    if (!provider || !msNewRequired) return;
    setTxPending('ms-set-req');
    try {
      const signer = await provider.getSigner();
      const c = new ethers.Contract(DEPLOYED_ADDRESSES.multiSigPolicy, ABIS.MultiSigPolicy, signer);
      toast('pending', 'Setting required approvals…');
      const tx = await c.setRequiredApprovals(Number(msNewRequired), GAS_OVERRIDES);
      await waitForTx(tx);
      toast('success', `Required approvals set to ${msNewRequired}`);
      setMsNewRequired('');
      await fetchPolicies();
    } catch (err: any) {
      toast('error', parseContractError(err));
    } finally { setTxPending(''); }
  };

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
          <button className="btn" onClick={fetchPolicies}><IconRefresh style={{ width: 14, height: 14 }} /> Refresh</button>
        </div>
      </div>

      {/* Policy cards */}
      <div className="policy-grid">
        {policies.map((p) => {
          const isWL = p.name === 'WhitelistPolicy';
          const isSL = p.name === 'SpendingLimitPolicy';
          const isRS = p.name === 'RiskScorePolicy';
          const isTL = p.name === 'TimelockPolicy';

          const isMS = p.name === 'MultiSigPolicy';

          return (
            <div key={p.address} className={`policy-card ${!p.active ? 'inactive' : ''}`} style={isMS ? { gridColumn: '1 / -1' } : undefined}>
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
                {!isMS && p.params.map((param, i) => (
                  <div key={i} className="policy-param">
                    <span className="p-label">{param.label}</span>
                    <span className="p-value">{param.value}</span>
                  </div>
                ))}

                {/* ── MultiSig Actions ── */}
                {isMS && (
                  <div style={{ marginTop: 4 }}>
                    {/* Tab bar */}
                    <div className="ms-tabs">
                      {(['approve', 'status', 'admin'] as const).map(tab => (
                        <button key={tab} className={`ms-tab ${msActiveTab === tab ? 'active' : ''}`} onClick={() => setMsActiveTab(tab)}>
                          {tab === 'approve' ? '✍ Approve / Revoke' : tab === 'status' ? '🔍 Tx Status' : '⚙ Admin'}
                        </button>
                      ))}
                    </div>

                    {/* ── Approve / Revoke Tab ── */}
                    {msActiveTab === 'approve' && (
                      <div className="ms-tab-content">
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>
                          Approve or revoke a pending transfer
                        </div>
                        <div className="ms-form-grid">
                          <div className="ms-field">
                            <label className="ms-label">Recipient</label>
                            <input className="input mono" placeholder="0x… recipient address" value={msApproveTo} onChange={e => setMsApproveTo(e.target.value)} />
                          </div>
                          <div className="ms-field">
                            <label className="ms-label">Amount (USDC)</label>
                            <input className="input" type="number" placeholder="e.g. 500" value={msApproveAmt} onChange={e => setMsApproveAmt(e.target.value)} />
                          </div>
                          <div className="ms-field">
                            <label className="ms-label">Token (optional, defaults to USDC)</label>
                            <input className="input mono" placeholder={shortenAddress(DEPLOYED_ADDRESSES.mockUSDC)} value={msApproveToken} onChange={e => setMsApproveToken(e.target.value)} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button className="btn btn-green" onClick={handleMsApprove} disabled={!!txPending || !msApproveTo || !msApproveAmt} style={{ flex: 1 }}>
                            {txPending === 'ms-approve' ? 'Approving…' : '✓ Approve Transaction'}
                          </button>
                          <button className="btn btn-red" onClick={handleMsRevoke} disabled={!!txPending || !msApproveTo || !msApproveAmt} style={{ flex: 1 }}>
                            {txPending === 'ms-revoke' ? 'Revoking…' : '✗ Revoke Approval'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Tx Status Tab ── */}
                    {msActiveTab === 'status' && (
                      <div className="ms-tab-content">
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>
                          Check approval status for a transfer
                        </div>
                        <div className="ms-form-grid">
                          <div className="ms-field">
                            <label className="ms-label">Recipient</label>
                            <input className="input mono" placeholder="0x… recipient" value={msLookupTo} onChange={e => setMsLookupTo(e.target.value)} />
                          </div>
                          <div className="ms-field">
                            <label className="ms-label">Amount (USDC)</label>
                            <input className="input" type="number" placeholder="e.g. 500" value={msLookupAmt} onChange={e => setMsLookupAmt(e.target.value)} />
                          </div>
                          <div className="ms-field">
                            <label className="ms-label">Token (optional)</label>
                            <input className="input mono" placeholder={shortenAddress(DEPLOYED_ADDRESSES.mockUSDC)} value={msLookupToken} onChange={e => setMsLookupToken(e.target.value)} />
                          </div>
                        </div>
                        <button className="btn btn-blue" onClick={handleMsLookup} disabled={!msLookupTo || !msLookupAmt} style={{ marginTop: 8, width: '100%' }}>
                          🔍 Check Approval Status
                        </button>

                        {msLookupResult && (
                          <div className="ms-result-box">
                            <div className="policy-param">
                              <span className="p-label">Tx Hash</span>
                              <code className="p-value" style={{ fontSize: 10 }}>{msLookupResult.hash.slice(0, 18)}…{msLookupResult.hash.slice(-8)}</code>
                            </div>
                            <div className="policy-param">
                              <span className="p-label">Approvals</span>
                              <span className="p-value" style={{ color: msLookupResult.enough ? 'var(--green)' : 'var(--amber)' }}>
                                {msLookupResult.count} / {msRequired} {msLookupResult.enough ? '✓ Ready' : '⏳ Pending'}
                              </span>
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>Signer Votes</div>
                              {msSigners.map((s, i) => (
                                <div key={i} className="policy-param">
                                  <code className="p-label" style={{ fontSize: 11 }}>{shortenAddress(s)}</code>
                                  <span className="p-value">
                                    {msLookupResult.signerApprovals[s]
                                      ? <span style={{ color: 'var(--green)' }}>✓ Approved</span>
                                      : <span style={{ color: 'var(--text-3)' }}>— Not yet</span>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Admin Tab ── */}
                    {msActiveTab === 'admin' && (
                      <div className="ms-tab-content">
                        {/* Signers list */}
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>
                          Signers ({msSigners.length}) — Required: {msRequired}
                        </div>
                        {msSigners.map((s, i) => (
                          <div key={i} className="inline-action" style={{ padding: '6px 0' }}>
                            <code style={{ fontSize: 11.5, flex: 1 }}>#{i + 1} {shortenAddress(s)}</code>
                            <button className="btn btn-red" onClick={() => handleMsRemoveSigner(s)} disabled={!!txPending} style={{ fontSize: 11, padding: '4px 8px' }}>
                              <IconTrash style={{ width: 12, height: 12 }} />
                            </button>
                          </div>
                        ))}

                        {/* Add signer */}
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>Add New Signer</div>
                          <div className="inline-action">
                            <input className="input mono" placeholder="0x… new signer address" value={msNewSigner} onChange={e => setMsNewSigner(e.target.value)} style={{ flex: 1 }} />
                            <button className="btn btn-green" onClick={handleMsAddSigner} disabled={!!txPending || !msNewSigner} style={{ fontSize: 12 }}>
                              <IconPlus style={{ width: 13, height: 13 }} /> {txPending === 'ms-add-signer' ? 'Adding…' : 'Add'}
                            </button>
                          </div>
                        </div>

                        {/* Set required */}
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>Required Approvals</div>
                          <div className="inline-action">
                            <input className="input" type="number" placeholder={`Current: ${msRequired}`} value={msNewRequired} onChange={e => setMsNewRequired(e.target.value)} style={{ flex: 1 }} />
                            <button className="btn btn-blue" onClick={handleMsSetRequired} disabled={!!txPending || !msNewRequired} style={{ fontSize: 12 }}>
                              {txPending === 'ms-set-req' ? 'Setting…' : 'Set Threshold'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Whitelist Actions ── */}
                {isWL && (
                  <div style={{ marginTop: 12 }}>
                    <div className="inline-action">
                      <input className="input mono" placeholder="0x… address to add" value={wlAddr} onChange={e => setWlAddr(e.target.value)} style={{ flex: 1 }} />
                      <button className="btn btn-green" onClick={handleAddWhitelist} disabled={!!txPending || !wlAddr} style={{ fontSize: 12 }}>
                        <IconPlus style={{ width: 13, height: 13 }} /> {txPending === 'wl-add' ? 'Adding…' : 'Add'}
                      </button>
                    </div>

                    {/* Show current whitelist with remove buttons */}
                    {whitelistAddrs.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>Current Whitelist</div>
                        {whitelistAddrs.map((a, i) => (
                          <div key={i} className="inline-action" style={{ padding: '6px 0' }}>
                            <code style={{ fontSize: 11.5, flex: 1 }}>{shortenAddress(a)}</code>
                            <button className="btn btn-red" onClick={() => handleRemoveWhitelist(a)} disabled={!!txPending} style={{ fontSize: 11, padding: '4px 8px' }}>
                              <IconTrash style={{ width: 12, height: 12 }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Spending Limit Actions ── */}
                {isSL && (
                  <div style={{ marginTop: 12 }}>
                    <div className="inline-action">
                      <input className="input" type="number" placeholder="Daily limit (USDC)" value={slDailyLimit} onChange={e => setSlDailyLimit(e.target.value)} style={{ flex: 1 }} />
                      <button className="btn btn-blue" onClick={handleSetDailyLimit} disabled={!!txPending || !slDailyLimit} style={{ fontSize: 12 }}>
                        {txPending === 'sl-daily' ? 'Setting…' : 'Set Daily Limit'}
                      </button>
                    </div>
                    <div className="inline-action">
                      <input className="input" type="number" placeholder="Max per tx (USDC)" value={slMaxTx} onChange={e => setSlMaxTx(e.target.value)} style={{ flex: 1 }} />
                      <button className="btn btn-blue" onClick={handleSetMaxTx} disabled={!!txPending || !slMaxTx} style={{ fontSize: 12 }}>
                        {txPending === 'sl-max' ? 'Setting…' : 'Set Max Tx'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Risk Score Actions ── */}
                {isRS && (
                  <div style={{ marginTop: 12 }}>
                    <div className="inline-action" style={{ flexWrap: 'wrap', gap: 6 }}>
                      <input className="input mono" placeholder="0x… address" value={rsAddr} onChange={e => setRsAddr(e.target.value)} style={{ flex: 2, minWidth: 140 }} />
                      <input className="input" type="number" placeholder="Score (0-100)" value={rsScore} onChange={e => setRsScore(e.target.value)} style={{ flex: 1, minWidth: 80 }} />
                      <button className="btn btn-blue" onClick={handleSetRiskScore} disabled={!!txPending || !rsAddr || !rsScore} style={{ fontSize: 12 }}>
                        {txPending === 'rs-score' ? 'Setting…' : 'Set Score'}
                      </button>
                    </div>
                    <div className="inline-action">
                      <input className="input" type="number" placeholder="Min threshold (e.g. 50)" value={rsThreshold} onChange={e => setRsThreshold(e.target.value)} style={{ flex: 1 }} />
                      <button className="btn btn-blue" onClick={handleSetThreshold} disabled={!!txPending || !rsThreshold} style={{ fontSize: 12 }}>
                        {txPending === 'rs-thresh' ? 'Setting…' : 'Set Threshold'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Timelock Actions ── */}
                {isTL && (
                  <div style={{ marginTop: 12 }}>
                    <div className="inline-action">
                      <input className="input" type="number" placeholder="Duration (seconds)" value={tlDuration} onChange={e => setTlDuration(e.target.value)} style={{ flex: 1 }} />
                      <button className="btn btn-blue" onClick={handleSetTimelockDuration} disabled={!!txPending || !tlDuration} style={{ fontSize: 12 }}>
                        {txPending === 'tl-dur' ? 'Setting…' : 'Set Duration'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="policy-card-foot">
                <a href={`https://sepolia.arbiscan.io/address/${p.address}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  View on Arbiscan <IconExternalLink style={{ width: 11, height: 11 }} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default PolicyManager;
