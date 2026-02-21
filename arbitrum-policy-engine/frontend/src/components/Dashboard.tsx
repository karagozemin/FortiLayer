import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { DEPLOYED_ADDRESSES, ABIS, shortenAddress, formatUSDC, formatTimestamp, getExplorerUrl, parseContractError, GAS_OVERRIDES, waitForTx } from '../utils/contracts';
import { IconRefresh, IconTreasury, IconShield, IconPolicy, IconActivity, IconExternalLink, IconSend, IconChevronDown, IconDownload } from './Icons';
import { useToast } from './Toast';

interface Stats {
  treasuryBalance: bigint;
  totalVaults: bigint;
  totalTxValidated: bigint;
  totalScreened: bigint;
  totalPassed: bigint;
  totalBlocked: bigint;
  activePolicies: number;
  isPaused: boolean;
  walletUSDC: bigint;
  walletAllowance: bigint;
}

interface ScreenEvent {
  vault: string;
  token: string;
  to: string;
  amount: bigint;
  passed: boolean;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

const Dashboard: React.FC = () => {
  const { provider, address } = useWallet();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<ScreenEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Action States ─────────────
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [txPending, setTxPending] = useState('');
  const [lastTxResult, setLastTxResult] = useState<{ type: 'success' | 'error'; msg: string; hash?: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!provider) return;
    try {
      const pe = new ethers.Contract(DEPLOYED_ADDRESSES.policyEngine, ABIS.PolicyEngine, provider);
      const fw = new ethers.Contract(DEPLOYED_ADDRESSES.treasuryFirewall, ABIS.TreasuryFirewall, provider);
      const usdc = new ethers.Contract(DEPLOYED_ADDRESSES.mockUSDC, ABIS.MockUSDC, provider);

      const walletAddr = address || ethers.ZeroAddress;
      const [totalVaults, totalTxValidated, isPaused, totalScreened, totalPassed, totalBlocked, treasuryBalance, vaultPolicies, walletUSDC, walletAllowance] = await Promise.all([
        pe.totalVaults(),
        pe.totalTransactionsValidated(),
        pe.paused(),
        fw.totalScreened(),
        fw.totalPassed(),
        fw.totalBlocked(),
        usdc.balanceOf(DEPLOYED_ADDRESSES.treasury),
        pe.getVaultPolicies(DEPLOYED_ADDRESSES.treasury).catch(() => []),
        usdc.balanceOf(walletAddr).catch(() => 0n),
        usdc.allowance(walletAddr, DEPLOYED_ADDRESSES.treasury).catch(() => 0n),
      ]);

      setStats({
        treasuryBalance, totalVaults, totalTxValidated, totalScreened, totalPassed, totalBlocked,
        activePolicies: vaultPolicies.length, isPaused, walletUSDC, walletAllowance,
      });

      const filter = fw.filters.TransactionScreened();
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);
      const logs = await fw.queryFilter(filter, fromBlock, currentBlock);

      const parsed: ScreenEvent[] = await Promise.all(
        logs.slice(-15).reverse().map(async (log: any) => {
          const block = await provider.getBlock(log.blockNumber);
          return {
            vault: log.args[0], token: log.args[1], to: log.args[2],
            amount: log.args[3], passed: log.args[4],
            txHash: log.transactionHash, blockNumber: log.blockNumber,
            timestamp: block?.timestamp || 0,
          };
        })
      );
      setEvents(parsed);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [provider, address]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 15000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchData]);

  // ── Action Handlers ─────────────
  const handleMint = async () => {
    if (!provider || !mintAmount) return;
    setTxPending('mint');
    setLastTxResult(null);
    try {
      const signer = await provider.getSigner();
      const usdc = new ethers.Contract(DEPLOYED_ADDRESSES.mockUSDC, ABIS.MockUSDC, signer);
      const amt = ethers.parseUnits(mintAmount, 6);
      toast('pending', 'Minting USDC…');
      const tx = await usdc.mint(await signer.getAddress(), amt, GAS_OVERRIDES);
      await waitForTx(tx);
      toast('success', `Minted ${mintAmount} USDC`);
      setLastTxResult({ type: 'success', msg: `Minted ${mintAmount} USDC`, hash: tx.hash });
      setMintAmount('');
      await fetchData();
    } catch (err: any) {
      const msg = parseContractError(err);
      toast('error', msg);
      setLastTxResult({ type: 'error', msg });
    } finally { setTxPending(''); }
  };

  const handleDeposit = async () => {
    if (!provider || !depositAmount) return;
    setTxPending('deposit');
    setLastTxResult(null);
    try {
      const signer = await provider.getSigner();
      const usdc = new ethers.Contract(DEPLOYED_ADDRESSES.mockUSDC, ABIS.MockUSDC, signer);
      const treasury = new ethers.Contract(DEPLOYED_ADDRESSES.treasury, ABIS.Treasury, signer);
      const amt = ethers.parseUnits(depositAmount, 6);

      // Approve first
      toast('pending', 'Approving USDC…');
      const approveTx = await usdc.approve(DEPLOYED_ADDRESSES.treasury, amt, GAS_OVERRIDES);
      await waitForTx(approveTx);

      // Deposit
      toast('pending', 'Depositing to Treasury…');
      const depTx = await treasury.deposit(DEPLOYED_ADDRESSES.mockUSDC, amt, GAS_OVERRIDES);
      await waitForTx(depTx);

      toast('success', `Deposited ${depositAmount} USDC to Treasury`);
      setLastTxResult({ type: 'success', msg: `Deposited ${depositAmount} USDC`, hash: depTx.hash });
      setDepositAmount('');
      await fetchData();
    } catch (err: any) {
      const msg = parseContractError(err);
      toast('error', msg);
      setLastTxResult({ type: 'error', msg });
    } finally { setTxPending(''); }
  };

  const handleTransfer = async () => {
    if (!provider || !sendTo || !sendAmount) return;
    setTxPending('transfer');
    setLastTxResult(null);
    try {
      const signer = await provider.getSigner();
      const treasury = new ethers.Contract(DEPLOYED_ADDRESSES.treasury, ABIS.Treasury, signer);

      const amt = ethers.parseUnits(sendAmount, 6);

      toast('pending', 'Requesting transfer through firewall…');
      const tx = await treasury.requestTransfer(DEPLOYED_ADDRESSES.mockUSDC, sendTo, amt, GAS_OVERRIDES);
      const receipt = await waitForTx(tx);

      // Check if it was passed or blocked by looking at events
      const fw = new ethers.Contract(DEPLOYED_ADDRESSES.treasuryFirewall, ABIS.TreasuryFirewall, provider);
      const screenedLogs = receipt.logs.map((l: any) => {
        try { return fw.interface.parseLog({ topics: l.topics as string[], data: l.data }); } catch { return null; }
      }).filter(Boolean);
      const screenResult = screenedLogs.find((l: any) => l?.name === 'TransactionScreened');
      const passed = screenResult ? screenResult.args[4] : true;

      if (passed) {
        toast('success', `Transfer of ${sendAmount} USDC sent through firewall`);
        setLastTxResult({ type: 'success', msg: `${sendAmount} USDC transferred to ${shortenAddress(sendTo)}`, hash: tx.hash });
      } else {
        toast('error', 'Transfer was BLOCKED by firewall policies');
        setLastTxResult({ type: 'error', msg: `Blocked by firewall — policies rejected the transfer` });
      }
      setSendTo('');
      setSendAmount('');
      await fetchData();
    } catch (err: any) {
      const msg = parseContractError(err);
      toast('error', msg);
      setLastTxResult({ type: 'error', msg });
    } finally { setTxPending(''); }
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /><p>Loading on-chain data…</p></div>;
  }

  const passRate = stats && Number(stats.totalScreened) > 0
    ? ((Number(stats.totalPassed) / Number(stats.totalScreened)) * 100).toFixed(1)
    : '100.0';

  const togglePanel = (id: string) => {
    setOpenPanel(prev => prev === id ? null : id);
    setLastTxResult(null);
  };

  return (
    <>
      {/* Metrics */}
      <div className="metrics">
        <div className="metric m-blue">
          <div className="metric-label">Treasury Balance</div>
          <div className="metric-value">{stats ? formatUSDC(stats.treasuryBalance) : '$0.00'}</div>
          <div className="metric-sub">MockUSDC in vault</div>
        </div>
        <div className="metric m-green">
          <div className="metric-label">Total Screened</div>
          <div className="metric-value">{stats ? Number(stats.totalScreened).toString() : '0'}</div>
          <div className="metric-sub">{passRate}% pass rate</div>
        </div>
        <div className="metric m-purple">
          <div className="metric-label">Active Policies</div>
          <div className="metric-value">{stats?.activePolicies ?? 0}</div>
          <div className="metric-sub">on treasury vault</div>
        </div>
        <div className="metric m-red">
          <div className="metric-label">Blocked</div>
          <div className="metric-value" style={{ color: Number(stats?.totalBlocked) > 0 ? 'var(--red)' : undefined }}>
            {stats ? Number(stats.totalBlocked).toString() : '0'}
          </div>
          <div className="metric-sub">transactions rejected</div>
        </div>
      </div>

      {/* ── ACTION PANELS ─────────────────────────────────── */}

      {/* Mint USDC */}
      <div className={`action-panel ${openPanel === 'mint' ? 'open' : ''}`}>
        <div className="action-panel-head" onClick={() => togglePanel('mint')}>
          <h3><IconTreasury style={{ width: 16, height: 16 }} /> Mint Test USDC</h3>
          <IconChevronDown className="chevron" />
        </div>
        {openPanel === 'mint' && (
          <div className="action-panel-body">
            <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 12 }}>
              Mint MockUSDC tokens to your wallet for testing. Your balance: <strong style={{ color: 'var(--text-1)' }}>{stats ? formatUSDC(stats.walletUSDC) : '$0.00'}</strong>
            </p>
            <div className="input-row">
              <div className="form-group">
                <label>Amount (USDC)</label>
                <input className="input" type="number" placeholder="1000" value={mintAmount} onChange={e => setMintAmount(e.target.value)} />
              </div>
              <button className="btn btn-blue" onClick={handleMint} disabled={!!txPending || !mintAmount}>
                {txPending === 'mint' ? 'Minting…' : 'Mint USDC'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deposit to Treasury */}
      <div className={`action-panel ${openPanel === 'deposit' ? 'open' : ''}`}>
        <div className="action-panel-head" onClick={() => togglePanel('deposit')}>
          <h3><IconDownload style={{ width: 16, height: 16 }} /> Deposit to Treasury</h3>
          <IconChevronDown className="chevron" />
        </div>
        {openPanel === 'deposit' && (
          <div className="action-panel-body">
            <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 12 }}>
              Deposit USDC from your wallet into the Treasury vault. Wallet balance: <strong style={{ color: 'var(--text-1)' }}>{stats ? formatUSDC(stats.walletUSDC) : '$0.00'}</strong>
            </p>
            <div className="input-row">
              <div className="form-group">
                <label>Amount (USDC)</label>
                <input className="input" type="number" placeholder="500" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
              </div>
              <button className="btn btn-blue" onClick={handleDeposit} disabled={!!txPending || !depositAmount}>
                {txPending === 'deposit' ? 'Depositing…' : 'Approve & Deposit'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Send Transfer */}
      <div className={`action-panel ${openPanel === 'transfer' ? 'open' : ''}`}>
        <div className="action-panel-head" onClick={() => togglePanel('transfer')}>
          <h3><IconSend style={{ width: 16, height: 16 }} /> Send Transfer (Through Firewall)</h3>
          <IconChevronDown className="chevron" />
        </div>
        {openPanel === 'transfer' && (
          <div className="action-panel-body">
            <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 12 }}>
              Request a USDC transfer from Treasury. The transaction will be screened by all active policies.
              Treasury balance: <strong style={{ color: 'var(--text-1)' }}>{stats ? formatUSDC(stats.treasuryBalance) : '$0.00'}</strong>
            </p>
            <div className="form-group">
              <label>Recipient Address</label>
              <input className="input mono" placeholder="0x..." value={sendTo} onChange={e => setSendTo(e.target.value)} />
            </div>
            <div className="input-row">
              <div className="form-group">
                <label>Amount (USDC)</label>
                <input className="input" type="number" placeholder="100" value={sendAmount} onChange={e => setSendAmount(e.target.value)} />
              </div>
              <button className="btn btn-green" onClick={handleTransfer} disabled={!!txPending || !sendTo || !sendAmount}>
                {txPending === 'transfer' ? 'Sending…' : 'Send Transfer'}
              </button>
            </div>
            {stats?.isPaused && (
              <div className="tx-result error" style={{ marginTop: 10 }}>
                ⚠ PolicyEngine is paused — transfers will be blocked
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tx result */}
      {lastTxResult && (
        <div className={`tx-result ${lastTxResult.type}`}>
          <span>{lastTxResult.type === 'success' ? '✓' : '✗'}</span>
          <span style={{ flex: 1 }}>{lastTxResult.msg}</span>
          {lastTxResult.hash && (
            <a href={getExplorerUrl(lastTxResult.hash)} target="_blank" rel="noopener noreferrer">
              View Tx <IconExternalLink style={{ width: 11, height: 11, display: 'inline', verticalAlign: '-1px' }} />
            </a>
          )}
        </div>
      )}

      {/* Two-column: Pass rate + System overview */}
      <div className="grid-2" style={{ marginTop: 12 }}>
        {/* Pass Rate */}
        <div className="card">
          <div className="card-head">
            <h3>Firewall Pass Rate</h3>
            <span className={`chip ${Number(passRate) >= 90 ? 'chip-green' : 'chip-amber'}`}>{passRate}%</span>
          </div>
          <div className="card-body">
            <div className="progress" style={{ marginBottom: 10 }}>
              <div className="progress-fill" style={{ width: `${passRate}%`, background: `linear-gradient(90deg, var(--green), var(--blue))` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-3)' }}>
              <span>Passed: {stats ? Number(stats.totalPassed).toString() : '0'}</span>
              <span>Blocked: {stats ? Number(stats.totalBlocked).toString() : '0'}</span>
            </div>
          </div>
        </div>

        {/* System Overview */}
        <div className="card">
          <div className="card-head">
            <h3>System Overview</h3>
            <span className={`chip ${stats?.isPaused ? 'chip-red' : 'chip-green'}`}>
              {stats?.isPaused ? 'Paused' : 'Live'}
            </span>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <KV label="Vaults" value={stats ? Number(stats.totalVaults).toString() : '0'} />
            <KV label="Validated" value={stats ? Number(stats.totalTxValidated).toString() : '0'} />
            <KV label="Your USDC" value={stats ? formatUSDC(stats.walletUSDC) : '$0.00'} />
            <KV label="Allowance" value={stats ? formatUSDC(stats.walletAllowance) : '$0.00'} />
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-head">
          <h3>Recent Screening Events</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label className="auto-refresh" style={{ cursor: 'pointer' }}>
              <span className={autoRefresh ? 'dot-live' : ''} style={autoRefresh ? { width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' } : { width: 6, height: 6, borderRadius: '50%', background: 'var(--text-3)' }} />
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ display: 'none' }} />
              Auto-refresh
            </label>
            <button className="btn" onClick={fetchData}><IconRefresh style={{ width: 14, height: 14 }} /> Refresh</button>
          </div>
        </div>
        <div className="card-body">
          {events.length === 0 ? (
            <div className="empty">
              <IconActivity style={{ width: 32, height: 32 }} />
              <p>No screening events yet</p>
              <p style={{ marginTop: 4, fontSize: 12, color: 'var(--text-3)' }}>Use "Send Transfer" above or run <code>npx hardhat run scripts/demo.ts --network arbitrumSepolia</code></p>
            </div>
          ) : (
            <div className="timeline">
              {events.map((ev, i) => (
                <div key={i} className={`tl-item ${ev.passed ? 'pass' : 'block'}`}>
                  <div className="tl-head">
                    <div className="tl-left">
                      <span className={`chip ${ev.passed ? 'chip-green' : 'chip-red'}`}>
                        {ev.passed ? 'Passed' : 'Blocked'}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{formatUSDC(ev.amount)}</span>
                    </div>
                    <span className="tl-time">
                      {ev.timestamp ? formatTimestamp(ev.timestamp) : `Block #${ev.blockNumber}`}
                    </span>
                  </div>
                  <div className="tl-meta">
                    <span>To: <code>{shortenAddress(ev.to)}</code></span>
                    <a href={getExplorerUrl(ev.txHash)} target="_blank" rel="noopener noreferrer">
                      Arbiscan <IconExternalLink style={{ width: 11, height: 11, display: 'inline', verticalAlign: '-1px' }} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const KV: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
    <span style={{ color: 'var(--text-3)' }}>{label}</span>
    <span style={{ fontWeight: 600, color: 'var(--text-1)', fontFamily: mono ? "'JetBrains Mono', monospace" : undefined, fontSize: mono ? 11.5 : undefined }}>
      {value}
    </span>
  </div>
);

export default Dashboard;
