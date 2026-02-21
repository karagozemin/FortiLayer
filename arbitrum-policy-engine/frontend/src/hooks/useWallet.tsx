import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { BrowserProvider } from 'ethers';
import {
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
  useAppKitNetwork,
  useDisconnect,
} from '@reown/appkit/react';
import type { Provider } from '@reown/appkit/react';

// Import to run the createAppKit side-effect
import '../config/appkit';

// ── Types ──────────────────────────────────────────────────────

interface WalletState {
  provider: BrowserProvider | null;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToArbitrumSepolia: () => Promise<void>;
}

const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

// ── Context ────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { open } = useAppKit();
  const { address, isConnected, status } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Provider>('eip155');
  const { chainId, switchNetwork } = useAppKitNetwork();
  const { disconnect: appKitDisconnect } = useDisconnect();

  const isConnecting = status === 'connecting' || status === 'reconnecting';

  // Build ethers BrowserProvider from the walletProvider
  const ethersProvider = useMemo(() => {
    if (!walletProvider || !isConnected) return null;
    try {
      return new BrowserProvider(walletProvider as any, chainId ? Number(chainId) : undefined);
    } catch {
      return null;
    }
  }, [walletProvider, isConnected, chainId]);

  const connect = async () => {
    await open({ view: 'Connect' });
  };

  const disconnect = () => {
    appKitDisconnect();
  };

  const switchToArbitrumSepolia = async () => {
    try {
      const { arbitrumSepolia } = await import('@reown/appkit/networks');
      switchNetwork(arbitrumSepolia);
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  const state: WalletContextType = {
    provider: ethersProvider,
    address: address ?? null,
    chainId: chainId ? Number(chainId) : null,
    isConnected,
    isConnecting,
    error: null,
    connect,
    disconnect,
    switchToArbitrumSepolia,
  };

  return (
    <WalletContext.Provider value={state}>
      {children}
    </WalletContext.Provider>
  );
};

// ── Hook ───────────────────────────────────────────────────────

export const useWallet = (): WalletContextType => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
};

export { ARBITRUM_SEPOLIA_CHAIN_ID };

