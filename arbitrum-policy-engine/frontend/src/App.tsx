import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import PolicyManager from './components/PolicyManager';
import TransactionQueue from './components/TransactionQueue';
import FirewallStatus from './components/FirewallStatus';
import { WalletProvider, useWallet, ARBITRUM_SEPOLIA_CHAIN_ID } from './hooks/useWallet';
import {
  IconShield, IconDashboard, IconPolicy, IconTransaction,
  IconFirewall, IconAlertTriangle,
} from './components/Icons';

type Page = 'dashboard' | 'policies' | 'transactions' | 'firewall';

const NAV = [
  { id: 'dashboard' as Page, label: 'Dashboard', Icon: IconDashboard },
  { id: 'policies' as Page, label: 'Policies', Icon: IconPolicy },
  { id: 'transactions' as Page, label: 'Transactions', Icon: IconTransaction },
  { id: 'firewall' as Page, label: 'Firewall', Icon: IconFirewall },
] as const;

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  policies: 'Policy Manager',
  transactions: 'Transaction Monitor',
  firewall: 'Firewall Status',
};

const AppContent: React.FC = () => {
  const [page, setPage] = useState<Page>('dashboard');
  const { isConnected, chainId, error } = useWallet();

  const wrongChain = isConnected && chainId !== ARBITRUM_SEPOLIA_CHAIN_ID;
  const canNavigate = isConnected && !wrongChain;

  const renderContent = () => {
    if (!isConnected) {
      return (
        <div className="welcome">
          <div className="welcome-icon">
            <IconShield />
          </div>
          <h2>Welcome to FortiLayer</h2>
          <p>
            Programmable treasury execution firewall deployed on Arbitrum Sepolia.
            Connect your wallet to monitor and manage on-chain security policies.
          </p>

          <div className="features">
            <div className="feat">
              <div className="feat-icon" style={{ background: 'var(--blue-dim)' }}>
                <IconShield style={{ color: 'var(--blue)' }} />
              </div>
              <span>Real-time Screening</span>
            </div>
            <div className="feat">
              <div className="feat-icon" style={{ background: 'var(--green-dim)' }}>
                <IconPolicy style={{ color: 'var(--green)' }} />
              </div>
              <span>5 Policy Modules</span>
            </div>
            <div className="feat">
              <div className="feat-icon" style={{ background: 'var(--purple-dim)' }}>
                <IconFirewall style={{ color: 'var(--purple)' }} />
              </div>
              <span>On-chain Verified</span>
            </div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <appkit-button />
          </div>
          {error && <p style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</p>}
        </div>
      );
    }

    if (wrongChain) {
      return (
        <div className="wrong-net">
          <IconAlertTriangle style={{ width: 48, height: 48, color: 'var(--amber)' }} />
          <h2>Wrong Network</h2>
          <p>Switch to Arbitrum Sepolia to continue</p>
          <appkit-network-button />
        </div>
      );
    }

    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'policies': return <PolicyManager />;
      case 'transactions': return <TransactionQueue />;
      case 'firewall': return <FirewallStatus />;
    }
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <IconShield />
          </div>
          <div>
            <h1>FortiLayer</h1>
            <span>Treasury Firewall</span>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-label">Navigation</div>
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''} ${!canNavigate ? 'disabled' : ''}`}
              onClick={() => canNavigate && setPage(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className={`network-pill ${wrongChain ? 'wrong' : ''}`}>
            <span className="dot" />
            {!isConnected ? 'Not connected' : wrongChain ? `Wrong chain (${chainId})` : 'Arbitrum Sepolia'}
          </div>
          <appkit-button />
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <h2>{canNavigate ? PAGE_TITLES[page] : 'FortiLayer'}</h2>
          </div>
          {canNavigate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <appkit-network-button />
              <appkit-account-button />
            </div>
          )}
        </header>

        <div className="content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <WalletProvider>
    <AppContent />
  </WalletProvider>
);

export default App;
