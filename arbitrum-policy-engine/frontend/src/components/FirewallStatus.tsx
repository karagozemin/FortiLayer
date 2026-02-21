import React, { useState } from 'react';

// ── Firewall Status Page ───────────────────────────────────────

const FirewallStatus: React.FC = () => {
  const [isActive, setIsActive] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  const metrics = {
    totalScreened: 47,
    totalPassed: 35,
    totalBlocked: 12,
    uptime: '99.97%',
    avgLatency: '< 200ms',
    authorizedVaults: 3,
    registeredPolicies: 5,
    lastIncident: '2 hours ago',
  };

  const passRate = ((metrics.totalPassed / metrics.totalScreened) * 100).toFixed(1);

  const handleEmergencyToggle = () => {
    if (showConfirm) {
      setIsActive(!isActive);
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Firewall Status</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          System health and emergency controls
        </p>
      </div>

      {/* Hero Status */}
      <div className="firewall-hero">
        <div className={`firewall-shield ${isActive ? 'active' : 'paused'}`}>
          <div className="shield-icon">🛡</div>
          <div className="shield-pulse" />
        </div>
        <h2 className="firewall-title">
          {isActive ? 'Firewall Active' : '⚠️ Firewall Paused'}
        </h2>
        <p className="firewall-subtitle">
          {isActive
            ? 'All treasury transactions are being screened in real-time'
            : 'WARNING: Transaction screening is disabled. Treasury is unprotected.'}
        </p>
        <div className={`firewall-status-badge ${isActive ? 'active' : 'paused'}`}>
          <span className="status-dot" />
          {isActive ? 'OPERATIONAL' : 'PAUSED'}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="stats-grid" style={{ marginTop: '32px' }}>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{metrics.totalScreened}</div>
          <div className="stat-label">Total Screened</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {metrics.totalPassed}
          </div>
          <div className="stat-label">Passed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚫</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {metrics.totalBlocked}
          </div>
          <div className="stat-label">Blocked</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-value">{passRate}%</div>
          <div className="stat-label">Pass Rate</div>
        </div>
      </div>

      {/* System Health */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">System Health</h3>
          <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
            {isActive ? 'Healthy' : 'Paused'}
          </span>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <div className="health-grid">
            <HealthRow label="Uptime" value={metrics.uptime} status="good" />
            <HealthRow label="Avg Screening Latency" value={metrics.avgLatency} status="good" />
            <HealthRow
              label="Authorized Vaults"
              value={metrics.authorizedVaults.toString()}
              status="good"
            />
            <HealthRow
              label="Registered Policies"
              value={metrics.registeredPolicies.toString()}
              status="good"
            />
            <HealthRow
              label="Last Blocked Transaction"
              value={metrics.lastIncident}
              status="warning"
            />
            <HealthRow
              label="Firewall Status"
              value={isActive ? 'Active' : 'PAUSED'}
              status={isActive ? 'good' : 'critical'}
            />
          </div>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Transaction Flow</h3>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <div className="flow-diagram">
            <FlowStep icon="💰" label="Treasury" desc="Initiates transfer" />
            <FlowArrow />
            <FlowStep icon="🛡" label="Firewall" desc="Screens transaction" active />
            <FlowArrow />
            <FlowStep icon="⚙️" label="Policy Engine" desc="Validates all rules" />
            <FlowArrow />
            <FlowStep icon="📋" label="Policies" desc="5 modules check" />
            <FlowArrow />
            <FlowStep icon="✅" label="Execute" desc="Or block & revert" />
          </div>
        </div>
      </div>

      {/* Emergency Controls */}
      <div className="card" style={{ marginTop: '24px', borderColor: 'var(--danger)' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ color: 'var(--danger)' }}>
            ⚠️ Emergency Controls
          </h3>
        </div>
        <div style={{ padding: '0 24px 24px' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
            {isActive
              ? 'Pausing the firewall will disable all transaction screening. Only use in emergencies.'
              : 'The firewall is currently paused. Resume screening to protect treasury operations.'}
          </p>

          {showConfirm && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <p style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '8px' }}>
                ⚠️ Are you sure?
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {isActive
                  ? 'This will disable all transaction screening. Treasury transfers will proceed without policy checks.'
                  : 'This will re-enable transaction screening for all authorized vaults.'}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className={`btn ${isActive ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleEmergencyToggle}
            >
              {showConfirm
                ? 'Confirm'
                : isActive
                ? '🔴 Emergency Pause'
                : '🟢 Resume Firewall'}
            </button>
            {showConfirm && (
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────

const HealthRow: React.FC<{
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
}> = ({ label, value, status }) => {
  const colors = {
    good: 'var(--success)',
    warning: 'var(--warning)',
    critical: 'var(--danger)',
  };
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color: colors[status], fontWeight: 600 }}>{value}</span>
    </div>
  );
};

const FlowStep: React.FC<{
  icon: string;
  label: string;
  desc: string;
  active?: boolean;
}> = ({ icon, label, desc, active }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      padding: '16px',
      background: active ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-primary)',
      borderRadius: '12px',
      border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
      minWidth: '100px',
    }}
  >
    <span style={{ fontSize: '28px' }}>{icon}</span>
    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
      {label}
    </span>
    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
      {desc}
    </span>
  </div>
);

const FlowArrow: React.FC = () => (
  <div
    style={{
      color: 'var(--text-muted)',
      fontSize: '20px',
      display: 'flex',
      alignItems: 'center',
    }}
  >
    →
  </div>
);

export default FirewallStatus;
