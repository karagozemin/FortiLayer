import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { DEPLOYED_ADDRESSES, ABIS, shortenAddress, formatUSDC, formatTimestamp, getExplorerUrl } from '../utils/contracts';
import { IconRefresh, IconExternalLink, IconInbox } from './Icons';

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

type Filter = 'all' | 'passed' | 'blocked';

const TransactionQueue: React.FC = () => {
  const { provider } = useWallet();
  const [events, setEvents] = useState<ScreenEvent[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [counters, setCounters] = useState({ screened: 0, passed: 0, blocked: 0 });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!provider) return;
    try {
      const fw = new ethers.Contract(DEPLOYED_ADDRESSES.treasuryFirewall, ABIS.TreasuryFirewall, provider);

      const [screened, passed, blocked] = await Promise.all([
        fw.totalScreened(), fw.totalPassed(), fw.totalBlocked(),
      ]);
      setCounters({ screened: Number(screened), passed: Number(passed), blocked: Number(blocked) });

      const eventFilter = fw.filters.TransactionScreened();
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 50000);
      const logs = await fw.queryFilter(eventFilter, fromBlock, currentBlock);

      const parsed: ScreenEvent[] = await Promise.all(
        logs.slice(-40).reverse().map(async (log: any) => {
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
      setLastUpdate(new Date());
    } catch (err) {
      console.error('TransactionQueue error:', err);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => { setLoading(true); fetchEvents(); }, [fetchEvents]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchEvents, 15000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchEvents]);

  const filtered = events.filter(ev =>
    filter === 'all' ? true : filter === 'passed' ? ev.passed : !ev.passed
  );

  if (loading) {
    return <div className="loading"><div className="spinner" /><p>Fetching screening events…</p></div>;
  }

  return (
    <>
      {/* Counters */}
      <div className="metrics" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="metric m-cyan">
          <div className="metric-label">Total Screened</div>
          <div className="metric-value">{counters.screened}</div>
        </div>
        <div className="metric m-green">
          <div className="metric-label">Passed</div>
          <div className="metric-value" style={{ color: 'var(--green)' }}>{counters.passed}</div>
        </div>
        <div className="metric m-red">
          <div className="metric-label">Blocked</div>
          <div className="metric-value" style={{ color: counters.blocked > 0 ? 'var(--red)' : undefined }}>{counters.blocked}</div>
        </div>
      </div>

      {/* Event List */}
      <div className="card">
        <div className="card-head">
          <h3>Screening History</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="auto-refresh" style={{ cursor: 'pointer' }}>
              <span style={autoRefresh ? { width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' } : { width: 6, height: 6, borderRadius: '50%', background: 'var(--text-3)', display: 'inline-block' }} />
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ display: 'none' }} />
              <span style={{ fontSize: 11 }}>Live</span>
            </label>
            <div className="tabs">
              {(['all', 'passed', 'blocked'] as const).map(f => (
                <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'passed' ? ` (${counters.passed})` : f === 'blocked' ? ` (${counters.blocked})` : ''}
                </button>
              ))}
            </div>
            <button className="btn" onClick={fetchEvents}><IconRefresh style={{ width: 14, height: 14 }} /></button>
          </div>
        </div>

        {lastUpdate && (
          <div style={{ padding: '4px 20px', fontSize: 11, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
            Last updated: {lastUpdate.toLocaleTimeString()}
            {autoRefresh && <span style={{ marginLeft: 6 }}> • refreshes every 15s</span>}
          </div>
        )}

        <div className="card-body">
          {filtered.length === 0 ? (
            <div className="empty">
              <IconInbox />
              <p>{events.length === 0 ? 'No screening events yet' : 'No matching events'}</p>
              {events.length === 0 && (
                <p style={{ marginTop: 4, fontSize: 12, color: 'var(--text-3)' }}>
                  Go to Dashboard → Send Transfer to create a transaction
                </p>
              )}
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Recipient</th>
                  <th>Time</th>
                  <th style={{ textAlign: 'right' }}>Tx</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ev, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`chip ${ev.passed ? 'chip-green' : 'chip-red'}`}>
                        {ev.passed ? 'Passed' : 'Blocked'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 }}>
                      {formatUSDC(ev.amount)}
                    </td>
                    <td><code style={{ fontSize: 11.5 }}>{shortenAddress(ev.to)}</code></td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {ev.timestamp ? formatTimestamp(ev.timestamp) : `#${ev.blockNumber}`}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <a href={getExplorerUrl(ev.txHash)} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        View <IconExternalLink style={{ width: 11, height: 11 }} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default TransactionQueue;
