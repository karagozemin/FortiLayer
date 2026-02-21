import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { DEPLOYED_ADDRESSES, ABIS, shortenAddress, formatUSDC, formatTimestamp } from '../utils/contracts';
import { IconRefresh, IconTreasury, IconShield, IconPolicy, IconActivity, IconExternalLink } from './Icons';

interface Stats {
  treasuryBalance: bigint;
  totalVaults: bigint;
  totalTxValidated: bigint;
  totalScreened: bigint;
  totalPassed: bigint;
  totalBlocked: bigint;
  activePolicies: number;
  isPaused: boolean;
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
  const { provider } = useWallet();
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<ScreenEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const pe = new ethers.Contract(DEPLOYED_ADDRESSES.policyEngine, ABIS.PolicyEngine, provider);
      const fw = new ethers.Contract(DEPLOYED_ADDRESSES.treasuryFirewall, ABIS.TreasuryFirewall, provider);
      const usdc = new ethers.Contract(DEPLOYED_ADDRESSES.mockUSDC, ABIS.MockUSDC, provider);

      const [totalVaults, totalTxValidated, isPaused, totalScreened, totalPassed, totalBlocked, treasuryBalance, vaultPolicies] = await Promise.all([
        pe.totalVaults(),
        pe.totalTransactionsValidated(),
        pe.paused(),
        fw.totalScreened(),
        fw.totalPassed(),
        fw.totalBlocked(),
        usdc.balanceOf(DEPLOYED_ADDRESSES.treasury),
        pe.getVaultPolicies(DEPLOYED_ADDRESSES.treasury).catch(() => []),
      ]);

      setStats({ treasuryBalance, totalVaults, totalTxValidated, totalScreened, totalPassed, totalBlocked, activePolicies: vaultPolicies.length, isPaused });

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
  }, [provider]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="loading"><div className="spinner" /><p>Loading on-chain data…</p></div>;
  }

  const passRate = stats && Number(stats.totalScreened) > 0
    ? ((Number(stats.totalPassed) / Number(stats.totalScreened)) * 100).toFixed(1)
    : '100.0';

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

      {/* Two-column: Pass rate + System overview */}
      <div className="grid-2">
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
            <KV label="PolicyEngine" value={shortenAddress(DEPLOYED_ADDRESSES.policyEngine)} mono />
            <KV label="Treasury" value={shortenAddress(DEPLOYED_ADDRESSES.treasury)} mono />
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-head">
          <h3>Recent Screening Events</h3>
          <button className="btn" onClick={fetchData}><IconRefresh style={{ width: 14, height: 14 }} /> Refresh</button>
        </div>
        <div className="card-body">
          {events.length === 0 ? (
            <div className="empty">
              <IconActivity style={{ width: 32, height: 32 }} />
              <p>No screening events yet</p>
              <p style={{ marginTop: 4 }}>Run <code>npx hardhat run scripts/demo.ts --network arbitrumSepolia</code></p>
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
                    <a href={`https://sepolia.arbiscan.io/tx/${ev.txHash}`} target="_blank" rel="noopener noreferrer">
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
