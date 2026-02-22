import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import PolicyManager from './components/PolicyManager';
import TransactionQueue from './components/TransactionQueue';
import FirewallStatus from './components/FirewallStatus';
import DarkVeil from './components/DarkVeil';
import Landing from './components/Landing';
import { ToastProvider } from './components/Toast';
import { WalletProvider, useWallet, ARBITRUM_SEPOLIA_CHAIN_ID } from './hooks/useWallet';
import {
  IconShield, IconDashboard, IconPolicy, IconTransaction,
  IconFirewall, IconAlertTriangle,
} from './components/Icons';
import logoImg from './assets/logo.png';

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

  /* ── Landing page (not connected) ─────────────────────── */
  if (!isConnected) {
    return <Landing />;
  }

  const renderContent = () => {
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
      <div className="veil-fixed">
        <DarkVeil
          hueShift={0}
          noiseIntensity={0.02}
          scanlineIntensity={0.03}
          speed={2}
          scanlineFrequency={1.2}
          warpAmount={0.25}
          resolutionScale={0.5}
        />
      </div>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logoImg} alt="FortiLayer" className="brand-logo" />
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
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  </WalletProvider>
);

export default App;
