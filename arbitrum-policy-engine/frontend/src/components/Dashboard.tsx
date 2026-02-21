import React, { useState, useEffect } from 'react';
import {
  DashboardStats,
  TransactionRecord,
  TransactionStatus,
} from '../types';
import { shortenAddress, formatUSDC, formatTimestamp } from '../utils/contracts';

// ── Mock data for demo (replace with live contract reads) ──────

const MOCK_STATS: DashboardStats = {
  treasuryBalance: '250000',
  totalTransactions: 47,
  activePolicies: 5,
  blockedTransactions: 12,
  passRate: 74.5,
};

const MOCK_TRANSACTIONS: TransactionRecord[] = [
  {
    id: '1',
    vault: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    to: '0x1234567890abcdef1234567890abcdef12345678',
    amount: '5000',
    timestamp: Date.now() / 1000 - 120,
    status: 'passed',
    txHash: '0xabc123...def456',
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
    txHash: '0x789abc...123def',
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
    txHash: '0xdef789...abc012',
  },
];

// ── Stat Card Component ────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string;
  icon: string;
  trend?: string;
  trendUp?: boolean;
}> = ({ label, value, icon, trend, trendUp }) => (
  <div className="stat-card">
    <div className="stat-icon">{icon}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
    {trend && (
      <div className={`stat-trend ${trendUp ? 'up' : 'down'}`}>
        {trendUp ? '↑' : '↓'} {trend}
      </div>
    )}
  </div>
);

// ── Status Badge ───────────────────────────────────────────────

const StatusBadge: React.FC<{ status: TransactionStatus }> = ({ status }) => {
  const config = {
    passed: { label: 'Passed', className: 'badge badge-success' },
    blocked: { label: 'Blocked', className: 'badge badge-danger' },
    pending: { label: 'Pending', className: 'badge badge-warning' },
    executed: { label: 'Executed', className: 'badge badge-success' },
  };
  const { label, className } = config[status];
  return <span className={className}>{label}</span>;
};

// ── Dashboard Component ────────────────────────────────────────

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>(MOCK_STATS);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(MOCK_TRANSACTIONS);
  const [loading, setLoading] = useState(false);

  // Animated counter effect
  const [animatedBalance, setAnimatedBalance] = useState(0);
  useEffect(() => {
    const target = parseFloat(stats.treasuryBalance);
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedBalance(target * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [stats.treasuryBalance]);

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Dashboard</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          Real-time treasury protection overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          icon="💰"
          label="Treasury Balance"
          value={formatUSDC(animatedBalance.toFixed(0))}
          trend="+12.5% this week"
          trendUp={true}
        />
        <StatCard
          icon="📊"
          label="Total Transactions"
          value={stats.totalTransactions.toString()}
          trend="8 today"
          trendUp={true}
        />
        <StatCard
          icon="📋"
          label="Active Policies"
          value={stats.activePolicies.toString()}
        />
        <StatCard
          icon="🚫"
          label="Blocked"
          value={stats.blockedTransactions.toString()}
          trend={`${stats.passRate}% pass rate`}
          trendUp={stats.passRate > 70}
        />
      </div>

      {/* Recent Transactions */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Recent Transactions</h3>
          <span className="badge badge-info">{transactions.length} total</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Recipient</th>
              <th>Amount</th>
              <th>Time</th>
              <th>Policy</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>
                  <StatusBadge status={tx.status} />
                </td>
                <td>
                  <code>{shortenAddress(tx.to)}</code>
                </td>
                <td>{formatUSDC(tx.amount)}</td>
                <td>{formatTimestamp(tx.timestamp)}</td>
                <td>
                  {tx.failedPolicy ? (
                    <span className="badge badge-danger">{tx.failedPolicy}</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pass Rate Visual */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Firewall Pass Rate</h3>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{
            height: '12px',
            background: 'var(--bg-primary)',
            borderRadius: '6px',
            overflow: 'hidden',
            marginTop: '8px',
          }}>
            <div style={{
              height: '100%',
              width: `${stats.passRate}%`,
              background: 'linear-gradient(90deg, var(--success), var(--primary))',
              borderRadius: '6px',
              transition: 'width 1.5s ease-out',
            }} />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}>
            <span>{stats.totalTransactions - stats.blockedTransactions} passed</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
              {stats.passRate}%
            </span>
            <span>{stats.blockedTransactions} blocked</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
