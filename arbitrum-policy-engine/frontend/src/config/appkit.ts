import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { arbitrumSepolia } from '@reown/appkit/networks';

// ── Configuration ──────────────────────────────────────────────

const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '';

const metadata = {
  name: 'FortiLayer',
  description: 'Programmable Treasury Execution Firewall on Arbitrum Sepolia',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://fortilayer.xyz',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
};

const ethersAdapter = new EthersAdapter();

// ── Create AppKit instance ─────────────────────────────────────

createAppKit({
  adapters: [ethersAdapter],
  networks: [arbitrumSepolia],
  projectId,
  metadata,
  themeMode: 'dark',
  features: {
    analytics: false,
  },
  themeVariables: {
    '--w3m-accent': '#6366f1',
  },
});

export { arbitrumSepolia };
