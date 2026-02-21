import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { DEPLOYED_ADDRESSES, ABIS, shortenAddress, formatUSDC, formatTimestamp } from '../utils/contracts';

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

const TransactionQueue: React.FC = () => {
  const { provider, signer } = useWallet();
  const [events, setEvents] = useState<ScreenEvent[]>([]);
  const [filter, setFilter] = useState<'all' | 'passed' | 'blocked'>('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ screened: 0, passed: 0, blocked: 0 });

  const fetchEvents = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const s = signer || provider;
      const fw = new ethers.Contract(DEPLOYED_ADDRESSES.treasuryFirewall, ABIS.TreasuryFirewall, s);

      // Fetch counters
      const [screened, passed, blocked] = await Promise.all([
        fw.totalScreened(),
        fw.totalPassed(),
        fw.totalBlocked(),
      ]);
      setStats({
        screened: Number(screened),
        passed: Number(passed),
        blocked: Number(blocked),
      });

      // Fetch TransactionScreened events
      const eventFilter = fw.filters.TransactionScreened();
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 50000);
      const logs = await fw.queryFilter(eventFilter, fromBlock, currentBlock);

      const parsed: ScreenEvent[] = await Promise.all(
        logs.slice(-50).reverse().map(async (log: any) => {
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
      console.error('TransactionQueue fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [provider, signer]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const filtered = events.filter(ev => {
    if (filter === 'passed') return ev.passed;
    if (filter === 'blocked') return !ev.passed;
    return true;
  });

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: 'var(--text-secondary)' }}>Fetching screening events from chain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Transaction Queue</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Live screening events from TreasuryFirewall
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchEvents} style={{ padding: '8px 16px' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats.screened}</div>
          <div className="stat-label">Total Screened</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.passed}</div>
          <div className="stat-label">Passed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚫</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.blocked}</div>
          <div className="stat-label">Blocked</div>
        </div>
      </div>

      {/* Filter + Timeline */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Screening History</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'passed', 'blocked'] as const).map(f => (
              <button
                key={f}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(f)}
                style={{ textTransform: 'capitalize', padding: '6px 16px', fontSize: '13px' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          {filtered.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>
              {events.length === 0
                ? '📭 No screening events yet. Run the demo script to generate transactions:\nnpx hardhat run scripts/demo.ts --network arbitrumSepolia'
                : 'No matching events for this filter.'}
            </p>
          ) : (
            <div className="timeline">
              {filtered.map((ev, i) => (
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
                      <span>Vault: <code>{shortenAddress(ev.vault)}</code></span>
                      <a
                        href={`https://sepolia.arbiscan.io/tx/${ev.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary)' }}
                      >
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

export default TransactionQueue;
