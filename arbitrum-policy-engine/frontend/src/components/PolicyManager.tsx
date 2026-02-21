import React, { useState } from 'react';
import { PolicyType } from '../types';

// ── Policy Configuration ───────────────────────────────────────

interface PolicyCardData {
  type: PolicyType;
  name: string;
  description: string;
  icon: string;
  color: string;
  active: boolean;
  params: { label: string; value: string; editable?: boolean }[];
}

const POLICY_DATA: PolicyCardData[] = [
  {
    type: 'SpendingLimit',
    name: 'Spending Limit',
    description: 'Enforces daily spending caps and per-transaction maximums to prevent treasury drain.',
    icon: '💳',
    color: '#3b82f6',
    active: true,
    params: [
      { label: 'Daily Limit', value: '100,000 USDC', editable: true },
      { label: 'Max Per Tx', value: '50,000 USDC', editable: true },
      { label: 'Spent Today', value: '23,450 USDC' },
      { label: 'Remaining', value: '76,550 USDC' },
    ],
  },
  {
    type: 'Whitelist',
    name: 'Whitelist',
    description: 'Only approved recipient addresses can receive funds. Blocks transfers to unknown wallets.',
    icon: '✅',
    color: '#10b981',
    active: true,
    params: [
      { label: 'Whitelisted Addrs', value: '12' },
      { label: 'Global Whitelist', value: '3' },
      { label: 'Last Added', value: '2 hours ago' },
    ],
  },
  {
    type: 'Timelock',
    name: 'Timelock',
    description: 'Enforces a cooldown period between consecutive transactions to prevent rapid drain attacks.',
    icon: '⏱',
    color: '#f59e0b',
    active: true,
    params: [
      { label: 'Cooldown Period', value: '300 seconds', editable: true },
      { label: 'Last Transaction', value: '12 min ago' },
      { label: 'Next Allowed', value: 'Now' },
    ],
  },
  {
    type: 'MultiSig',
    name: 'Multi-Signature',
    description: 'Requires M-of-N signer approvals before a transaction can execute. Enterprise-grade governance.',
    icon: '✍️',
    color: '#8b5cf6',
    active: false,
    params: [
      { label: 'Required Sigs', value: '2 of 3' },
      { label: 'Signers', value: '3 configured' },
      { label: 'Pending Approvals', value: '0' },
    ],
  },
  {
    type: 'RiskScore',
    name: 'Risk Score',
    description: 'Assigns 0-100 risk scores to addresses. Blocks transactions to addresses below the safety threshold.',
    icon: '📈',
    color: '#ef4444',
    active: true,
    params: [
      { label: 'Min Threshold', value: '50', editable: true },
      { label: 'Default Score', value: '70' },
      { label: 'Scored Addrs', value: '24' },
      { label: 'Flagged', value: '3' },
    ],
  },
];

// ── Policy Card ────────────────────────────────────────────────

const PolicyCard: React.FC<{
  policy: PolicyCardData;
  onToggle: (type: PolicyType) => void;
}> = ({ policy, onToggle }) => (
  <div className={`policy-card ${!policy.active ? 'inactive' : ''}`}>
    <div className="policy-card-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          className="policy-icon"
          style={{
            background: `${policy.color}20`,
            color: policy.color,
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}
        >
          {policy.icon}
        </div>
        <div>
          <h3 className="policy-card-title">{policy.name}</h3>
          <span
            className={`badge ${policy.active ? 'badge-success' : 'badge-warning'}`}
            style={{ marginTop: '4px' }}
          >
            {policy.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={policy.active}
          onChange={() => onToggle(policy.type)}
        />
        <span className="toggle-slider" />
      </label>
    </div>

    <p className="policy-card-desc">{policy.description}</p>

    <div className="policy-params">
      {policy.params.map((param, idx) => (
        <div key={idx} className="policy-param">
          <span className="param-label">{param.label}</span>
          <span className="param-value">
            {param.value}
            {param.editable && (
              <button
                className="param-edit-btn"
                title="Edit parameter"
              >
                ✏️
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// ── Policy Manager Page ────────────────────────────────────────

const PolicyManager: React.FC = () => {
  const [policies, setPolicies] = useState(POLICY_DATA);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const handleToggle = (type: PolicyType) => {
    setPolicies(prev =>
      prev.map(p => (p.type === type ? { ...p, active: !p.active } : p))
    );
  };

  const filtered = policies.filter(p => {
    if (filter === 'active') return p.active;
    if (filter === 'inactive') return !p.active;
    return true;
  });

  const activeCount = policies.filter(p => p.active).length;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Policy Manager</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          Configure and manage treasury protection policies
        </p>
      </div>

      {/* Summary Bar */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{activeCount}</strong> of{' '}
              {policies.length} policies active
            </span>
            <div style={{
              height: '8px',
              width: '120px',
              background: 'var(--bg-primary)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(activeCount / policies.length) * 100}%`,
                background: 'var(--primary)',
                borderRadius: '4px',
              }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'active', 'inactive'] as const).map(f => (
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
      </div>

      {/* Policy Cards Grid */}
      <div className="policy-grid">
        {filtered.map(policy => (
          <PolicyCard key={policy.type} policy={policy} onToggle={handleToggle} />
        ))}
      </div>
    </div>
  );
};

export default PolicyManager;
