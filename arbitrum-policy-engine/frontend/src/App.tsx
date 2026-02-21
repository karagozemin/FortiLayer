import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import PolicyManager from './components/PolicyManager';
import TransactionQueue from './components/TransactionQueue';
import FirewallStatus from './components/FirewallStatus';
import { WalletProvider, useWallet } from './hooks/useWallet';
import { shortenAddress } from './utils/contracts';

type Page = 'dashboard' | 'policies' | 'transactions' | 'firewall';

const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

const AppContent: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const { address, isConnected, isConnecting, chainId, error, connect, disconnect, switchToArbitrumSepolia } = useWallet();

  const wrongChain = isConnected && chainId !== ARBITRUM_SEPOLIA_CHAIN_ID;

  const navItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: '📊' },
    { id: 'policies' as Page, label: 'Policies', icon: '📋' },
    { id: 'transactions' as Page, label: 'Transactions', icon: '📤' },
    { id: 'firewall' as Page, label: 'Firewall', icon: '🛡' },
  ];

  const renderPage = () => {
    if (!isConnected) {
      return (
        <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '24px' }}>
          <div style={{ fontSize: '72px' }}>🛡</div>
          <h2 style={{ fontSize: '28px', fontWeight: 700 }}>Welcome to FortiLayer</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', textAlign: 'center' }}>
            Programmable Treasury Execution Firewall on Arbitrum Sepolia.
            Connect your wallet to interact with the deployed contracts.
          </p>
          <button className="btn btn-primary" onClick={connect} disabled={isConnecting} style={{ padding: '12px 32px', fontSize: '16px' }}>
            {isConnecting ? '⏳ Connecting...' : '🔗 Connect Wallet'}
          </button>
          {error && <p style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</p>}
        </div>
      );
    }

    if (wrongChain) {
      return (
        <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '24px' }}>
          <div style={{ fontSize: '72px' }}>⚠️</div>
          <h2 style={{ fontSize: '28px', fontWeight: 700 }}>Wrong Network</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Please switch to Arbitrum Sepolia (Chain ID: 421614)
          </p>
          <button className="btn btn-primary" onClick={switchToArbitrumSepolia} style={{ padding: '12px 32px', fontSize: '16px' }}>
            🔄 Switch to Arbitrum Sepolia
          </button>
        </div>
      );
    }

    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'policies': return <PolicyManager />;
      case 'transactions': return <TransactionQueue />;
      case 'firewall': return <FirewallStatus />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="shield">🛡</span>
          <div>
            <h1>FortiLayer</h1>
            <span>Treasury Firewall</span>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Main</div>
          {navItems.map((item) => (
            <div
              key={item.id}
              className={`nav-link ${activePage === item.id ? 'active' : ''}`}
              onClick={() => isConnected && !wrongChain && setActivePage(item.id)}
              style={{ opacity: isConnected && !wrongChain ? 1 : 0.5, cursor: isConnected && !wrongChain ? 'pointer' : 'default' }}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>

        <div className="nav-section">
          <div className="nav-section-title">Network</div>
          <div className="nav-link">
            <span className="icon">{wrongChain ? '⚠️' : '⚡'}</span>
            {wrongChain ? `Wrong Chain (${chainId})` : 'Arbitrum Sepolia'}
          </div>
        </div>

        <div className="connect-section">
          {isConnected ? (
            <div style={{ width: '100%' }}>
              <div className="wallet-status" style={{ color: 'var(--success)' }}>● Connected</div>
              <div className="wallet-address">{shortenAddress(address || '')}</div>
              <button
                className="btn btn-secondary"
                onClick={disconnect}
                style={{ width: '100%', marginTop: '8px', padding: '6px', fontSize: '12px' }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              onClick={connect}
              disabled={isConnecting}
              style={{ width: '100%', padding: '10px' }}
            >
              {isConnecting ? '⏳ ...' : '🔗 Connect'}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <WalletProvider>
    <AppContent />
  </WalletProvider>
);

export default App;
