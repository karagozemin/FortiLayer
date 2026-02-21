import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import PolicyManager from './components/PolicyManager';
import TransactionQueue from './components/TransactionQueue';
import FirewallStatus from './components/FirewallStatus';
import { WalletProvider } from './hooks/useWallet';

type Page = 'dashboard' | 'policies' | 'transactions' | 'firewall';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('dashboard');

  const navItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: '📊' },
    { id: 'policies' as Page, label: 'Policies', icon: '📋' },
    { id: 'transactions' as Page, label: 'Transactions', icon: '📤' },
    { id: 'firewall' as Page, label: 'Firewall', icon: '🛡' },
  ];

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'policies': return <PolicyManager />;
      case 'transactions': return <TransactionQueue />;
      case 'firewall': return <FirewallStatus />;
      default: return <Dashboard />;
    }
  };

  return (
    <WalletProvider>
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
                onClick={() => setActivePage(item.id)}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Network</div>
            <div className="nav-link">
              <span className="icon">⚡</span>
              Arbitrum Sepolia
            </div>
          </div>

          <div className="connect-section">
            <div>
              <div className="wallet-status">Connected</div>
              <div className="wallet-address">0x1234...5678</div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {renderPage()}
        </main>
      </div>
    </WalletProvider>
  );
};

export default App;
