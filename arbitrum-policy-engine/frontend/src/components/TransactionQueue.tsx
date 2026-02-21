import React, { useState } from 'react';
import { TransactionRecord, TransactionStatus } from '../types';
import { shortenAddress, formatUSDC, formatTimestamp } from '../utils/contracts';

// ── Mock Transaction Data ──────────────────────────────────────

const MOCK_TX: TransactionRecord[] = [
  {
    id: '1',
    vault: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    to: '0x1234567890abcdef1234567890abcdef12345678',
    amount: '5000',
    timestamp: Date.now() / 1000 - 120,
    status: 'passed',
    txHash: '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1',
  },
  {
    id: '2',
    vault: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    to: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    amount: '150000',
    timestamp: Date.now() / 1000 - 600,
    status: 'blocked',
    failedPolicy: 'SpendingLimitPolicy',
  },
  {
    id: '3',
    vault: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    to: '0x9876543210fedcba9876543210fedcba98765432',
    amount: '25000',
    timestamp: Date.now() / 1000 - 1800,
    status: 'passed',
    txHash: '0x789abcdef123789abcdef123789abcdef123789abcdef123789abcdef123789a',
  },
  {
    id: '4',
    vault: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    to: '0xbaadf00dbaadf00dbaadf00dbaadf00dbaadf00d',
    amount: '10000',
    timestamp: Date.now() / 1000 - 3600,
    status: 'blocked',
    failedPolicy: 'RiskScorePolicy',
  },
  {
    id: '5',
    vault: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    to: '0xfeedfacefeedfacefeedfacefeedfacefeedface',
    amount: '8000',
    timestamp: Date.now() / 1000 - 7200,
    status: 'passed',
    txHash: '0xfedcba987654fedcba987654fedcba987654fedcba987654fedcba987654fedc',
  },
  {
    id: '6',
    vault: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    to: '0xCafeBabeCafeBabeCafeBabeCafeBabeCafeBabe',
    amount: '45000',
    timestamp: Date.now() / 1000 - 10800,
    status: 'blocked',
    failedPolicy: 'WhitelistPolicy',
  },
  {
    id: '7',
    vault: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    to: '0x1111111111111111111111111111111111111111',
    amount: '2500',
    timestamp: Date.now() / 1000 - 14400,
    status: 'passed',
    txHash: '0x111aaa222bbb333ccc444ddd555eee666fff777888999aaabbbccc111aaa222b',
  },
  {
    id: '8',
    vault: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    to: '0x2222222222222222222222222222222222222222',
    amount: '75000',
    timestamp: Date.now() / 1000 - 18000,
    status: 'blocked',
    failedPolicy: 'TimelockPolicy',
  },
];

// ── Status Badge ───────────────────────────────────────────────

const StatusBadge: React.FC<{ status: TransactionStatus }> = ({ status }) => {
  const config: Record<TransactionStatus, { label: string; cls: string }> = {
    passed: { label: '✅ Passed', cls: 'badge badge-success' },
    blocked: { label: '🚫 Blocked', cls: 'badge badge-danger' },
    pending: { label: '⏳ Pending', cls: 'badge badge-warning' },
    executed: { label: '✅ Executed', cls: 'badge badge-success' },
  };
  const { label, cls } = config[status];
  return <span className={cls}>{label}</span>;
};

// ── Transaction Queue Page ─────────────────────────────────────

const TransactionQueue: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'passed' | 'blocked'>('all');
  const [transactions] = useState<TransactionRecord[]>(MOCK_TX);

  const filtered = transactions.filter(tx => {
    if (filter === 'passed') return tx.status === 'passed';
    if (filter === 'blocked') return tx.status === 'blocked';
    return true;
  });

  const passed = transactions.filter(t => t.status === 'passed').length;
  const blocked = transactions.filter(t => t.status === 'blocked').length;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Transaction Queue</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          View all screened treasury transactions
        </p>
      </div>

      {/* Summary Strip */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{transactions.length}</div>
          <div className="stat-label">Total Screened</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{passed}</div>
          <div className="stat-label">Passed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚫</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{blocked}</div>
          <div className="stat-label">Blocked</div>
        </div>
      </div>

      {/* Filter + Table */}
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

        {/* Timeline View */}
        <div className="timeline">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              className={`timeline-item ${tx.status === 'blocked' ? 'blocked' : 'passed'}`}
            >
              <div className="timeline-dot" />
              <div className="timeline-content">
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <StatusBadge status={tx.status} />
                    <span style={{ fontWeight: 600 }}>{formatUSDC(tx.amount)}</span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {formatTimestamp(tx.timestamp)}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '24px',
                  marginTop: '8px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  flexWrap: 'wrap',
                }}>
                  <span>
                    To: <code>{shortenAddress(tx.to)}</code>
                  </span>
                  <span>
                    Vault: <code>{shortenAddress(tx.vault)}</code>
                  </span>
                  {tx.failedPolicy && (
                    <span>
                      Failed: <span className="badge badge-danger">{tx.failedPolicy}</span>
                    </span>
                  )}
                  {tx.txHash && (
                    <a
                      href={`https://sepolia.arbiscan.io/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary)' }}
                    >
                      View on Arbiscan ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TransactionQueue;
