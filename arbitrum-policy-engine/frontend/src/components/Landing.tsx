import React from 'react';
import DarkVeil from './DarkVeil';
import { IconShield, IconPolicy, IconFirewall, IconTransaction, IconDashboard } from './Icons';
import logoImg from '../assets/logo.png';

const FEATURES = [
  {
    icon: IconShield,
    title: 'Policy-Based Screening',
    desc: 'Every transaction is validated against multiple on-chain policy modules before execution.',
    color: 'var(--blue)',
    bg: 'var(--blue-dim)',
  },
  {
    icon: IconPolicy,
    title: '6 Policy Modules',
    desc: 'SpendingLimit, Whitelist, Timelock, MultiSig, RiskScore, and Chainlink Oracle — all composable.',
    color: 'var(--green)',
    bg: 'var(--green-dim)',
  },
  {
    icon: IconFirewall,
    title: 'Execution Firewall',
    desc: 'Treasury transfers route through a programmable firewall that screens, logs, and blocks in real-time.',
    color: 'var(--purple)',
    bg: 'var(--purple-dim)',
  },
  {
    icon: IconTransaction,
    title: 'Stylus + Solidity',
    desc: 'Hybrid architecture: Rust/WASM policy on Stylus (4.8K gas) alongside Solidity policies on Arbitrum.',
    color: 'var(--cyan)',
    bg: 'rgba(34,211,238,.12)',
  },
  {
    icon: IconDashboard,
    title: 'Chainlink Oracles',
    desc: 'Real-time ETH/USD price feeds power oracle-based risk scoring for dynamic transaction limits.',
    color: 'var(--amber)',
    bg: 'rgba(245,158,11,.12)',
  },
  {
    icon: IconShield,
    title: '140+ Tests',
    desc: 'Comprehensive test suite covering all contracts, edge cases, and integration scenarios.',
    color: 'var(--red)',
    bg: 'rgba(239,68,68,.12)',
  },
];

const STATS = [
  { value: '12', label: 'Deployed Contracts' },
  { value: '6', label: 'Policy Modules' },
  { value: '140+', label: 'Tests Passing' },
  { value: '4.8K', label: 'Gas (Stylus)' },
];

const CONTRACTS = [
  { name: 'PolicyEngine', addr: '0x245118Fba999F1ed338174933f83bdD6e08327D9', short: '0x2451...27D9' },
  { name: 'TreasuryFirewall', addr: '0xE3Be337BdC98Af11D3C8bcaB9149356Ac013EE98', short: '0xE3Be...EE98' },
  { name: 'Treasury', addr: '0x9BcF0E126b82C8E7cC5151C77025b052732eC52E', short: '0x9BcF...C52E' },
  { name: 'SpendingLimit (Stylus)', addr: '0xb92da51e406b72fddd4cdc03b32ddd2bdeeb1c6e', short: '0xb92d...1c6e' },
  { name: 'OracleRiskScore', addr: '0x52d4E065453d0E3aabE727A38A33bFbE9f6b5795', short: '0x52d4...5795' },
  { name: 'PolicyRegistry', addr: '0x5f36947d6d829616bAd785Be7eCb13cf9370DAff', short: '0x5f36...DAff' },
];

const Landing: React.FC = () => {
  return (
    <div className="landing">
      {/* Background */}
      <div className="landing-bg">
        <DarkVeil
          hueShift={0}
          noiseIntensity={0.02}
          scanlineIntensity={0.04}
          speed={2}
          scanlineFrequency={1.5}
          warpAmount={0.3}
          resolutionScale={0.5}
        />
      </div>

      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <img src={logoImg} alt="FortiLayer" />
          <span>FortiLayer</span>
        </div>
        <div className="landing-nav-links">
          <a href="https://github.com/karagozemin/FortiLayer" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://sepolia.arbiscan.io/address/0x245118Fba999F1ed338174933f83bdD6e08327D9" target="_blank" rel="noopener noreferrer">Arbiscan</a>
          <appkit-button />
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-badge">🛡️ Built on Arbitrum Sepolia</div>
        <h1>The Programmable Execution<br />Firewall for On-Chain Treasuries</h1>
        <p className="landing-subtitle">
          Every treasury outflow is screened by composable policy modules — spending limits, 
          whitelists, timelocks, multi-sig, risk scoring, and Chainlink oracles — before a single 
          token leaves the vault.
        </p>
        <div className="landing-cta">
          <appkit-button />
        </div>

        {/* Stats */}
        <div className="landing-stats">
          {STATS.map((s) => (
            <div key={s.label} className="landing-stat">
              <span className="landing-stat-value">{s.value}</span>
              <span className="landing-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="landing-section">
        <h2 className="landing-section-title">How It Works</h2>
        <p className="landing-section-sub">
          A modular policy engine sits between your treasury and the blockchain.
          No transaction executes without passing every active policy.
        </p>
        <div className="landing-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature">
              <div className="landing-feature-icon" style={{ background: f.bg }}>
                <f.icon style={{ color: f.color, width: 22, height: 22 }} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section className="landing-section">
        <h2 className="landing-section-title">Architecture</h2>
        <p className="landing-section-sub">
          12 contracts deployed on Arbitrum Sepolia — fully verified on Arbiscan.
        </p>
        <div className="landing-arch">
          <div className="landing-arch-flow">
            <div className="landing-arch-node n-treasury">Treasury</div>
            <div className="landing-arch-arrow">→</div>
            <div className="landing-arch-node n-firewall">Firewall</div>
            <div className="landing-arch-arrow">→</div>
            <div className="landing-arch-node n-engine">PolicyEngine</div>
            <div className="landing-arch-arrow">→</div>
            <div className="landing-arch-node n-policies">6 Policies</div>
          </div>
          <div className="landing-contracts">
            {CONTRACTS.map((c) => (
              <a
                key={c.name}
                className="landing-contract"
                href={`https://sepolia.arbiscan.io/address/${c.addr}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="landing-contract-name">{c.name}</span>
                <code>{c.short} ↗</code>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <span>Powered by <a href="https://x.com/OverBlock_" target="_blank" rel="noopener noreferrer">OverBlock</a></span>
        <span>Created by <a href="https://x.com/kaptan_web3" target="_blank" rel="noopener noreferrer">Kaptan</a></span>
      </footer>
    </div>
  );
};

export default Landing;
