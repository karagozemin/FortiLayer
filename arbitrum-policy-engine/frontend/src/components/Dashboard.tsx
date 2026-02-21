import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { DEPLOYED_ADDRESSES, ABIS, shortenAddress, formatUSDC, formatTimestamp } from '../utils/contracts';

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
  const { provider, signer } = useWallet();
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<ScreenEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const signerOrProvider = signer || provider;
      const pe = new ethers.Contract(DEPLOYED_ADDRESSES.policyEngine, ABIS.PolicyEngine, signerOrProvider);
      const fw = new ethers.Contract(DEPLOYED_ADDRESSES.treasuryFirewall, ABIS.TreasuryFirewall, signerOrProvider);
      const usdc = new ethers.Contract(DEPLOYED_ADDRESSES.mockUSDC, ABIS.MockUSDC, signerOrProvider);
      const treasury = new ethers.Contract(DEPLOYED_ADDRESSES.treasury, ABIS.Treasury, signerOrProvider);

      // Fetch all stats in parallel
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

      setStats({
        treasuryBalance,
        totalVaults,
        totalTxValidated,
        totalScreened,
        totalPassed,
        totalBlocked,
        activePolicies: vaultPolicies.length,
        isPaused,
      });

      // Fetch screening events from TreasuryFirewall
      const filter = fw.filters.TransactionScreened();
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);
      const logs = await fw.queryFilter(filter, fromBlock, currentBlock);

      const parsed: ScreenEvent[] = await Promise.all(
        logs.slice(-20).reverse().map(async (log: any) => {
          const block = await provider.getBlock(log.blockNumber);
          return {
            vault: log.args[0],
            token: log.args[1],
            to: log.args[2],
            amount: log.args[3],
            passed: log.args[4],
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
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
  }, [provider, signer]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading on-chain data...</p>
        </div>
      </div>
    );
  }

  const passRate = stats && Number(stats.totalScreened) > 0
    ? ((Number(stats.totalPassed) / Number(stats.totalScreened)) * 100).toFixed(1)
    : '100.0';

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Live data from Arbitrum Sepolia</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData} style={{ padding: '8px 16px' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{stats ? formatUSDC(stats.treasuryBalance) : '$0'}</div>
          <div className="stat-label">Treasury Balance</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats ? Number(stats.totalScreened).toString() : '0'}</div>
          <div className="stat-label">Total Screened</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{stats?.activePolicies ?? 0}</div>
          <div className="stat-label">Active Policies</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚫</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats ? Number(stats.totalBlocked).toString() : '0'}</div>
          <div className="stat-label">Blocked</div>
        </div>
      </div>

      {/* Pass Rate Bar */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Firewall Pass Rate</h3>
          <span className="badge badge-success">{passRate}%</span>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ height: '12px', background: 'var(--bg-primary)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${passRate}%`,
              background: `linear-gradient(90deg, var(--success), var(--primary))`,
              borderRadius: '6px',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>✅ Passed: {stats ? Number(stats.totalPassed).toString() : '0'}</span>
            <span>🚫 Blocked: {stats ? Number(stats.totalBlocked).toString() : '0'}</span>
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">System Overview</h3>
          <span className={`badge ${stats?.isPaused ? 'badge-danger' : 'badge-success'}`}>
            {stats?.isPaused ? '⏸ Paused' : '● Live'}
          </span>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <InfoRow label="Registered Vaults" value={stats ? Number(stats.totalVaults).toString() : '0'} />
            <InfoRow label="Transactions Validated" value={stats ? Number(stats.totalTxValidated).toString() : '0'} />
            <InfoRow label="PolicyEngine" value={shortenAddress(DEPLOYED_ADDRESSES.policyEngine)} />
            <InfoRow label="TreasuryFirewall" value={shortenAddress(DEPLOYED_ADDRESSES.treasuryFirewall)} />
            <InfoRow label="Treasury" value={shortenAddress(DEPLOYED_ADDRESSES.treasury)} />
            <InfoRow label="MockUSDC" value={shortenAddress(DEPLOYED_ADDRESSES.mockUSDC)} />
          </div>
        </div>
      </div>

      {/* Recent Screening Events */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Recent Screening Events</h3>
          <span className="badge badge-info">{events.length} events</span>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          {events.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
              No screening events yet. Run the demo script to generate transactions.
            </p>
          ) : (
            <div className="timeline">
              {events.map((ev, i) => (
                <div key={i} className={`timeline-item ${ev.passed ? 'passed' : 'blocked'}`}>
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className={`badge ${ev.passed ? 'badge-success' : 'badge-danger'}`}>
                          {ev.passed ? '✅ Passed' : '🚫 Blocked'}
                        </span>
                        <span style={{ fontWeight: 600 }}>{formatUSDC(ev.amount)}</span>
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {ev.timestamp ? formatTimestamp(ev.timestamp) : `Block #${ev.blockNumber}`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '24px', marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span>To: <code>{shortenAddress(ev.to)}</code></span>
                      <a href={`https://sepolia.arbiscan.io/tx/${ev.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                        View on Arbiscan ↗
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{label}</span>
    <span style={{ fontWeight: 600, fontSize: '13px', fontFamily: 'monospace' }}>{value}</span>
  </div>
);

export default Dashboard;
