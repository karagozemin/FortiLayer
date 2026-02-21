import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';

// ── Types ──────────────────────────────────────────────────────

interface WalletState {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
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
const ARBITRUM_SEPOLIA_CONFIG = {
  chainId: '0x66eee',
  chainName: 'Arbitrum Sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
  blockExplorerUrls: ['https://sepolia.arbiscan.io'],
};

// ── Context ────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const initialState: WalletState = {
  provider: null,
  signer: null,
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  error: null,
};

// ── Provider ───────────────────────────────────────────────────

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalletState>(initialState);

  const connect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setState(prev => ({ ...prev, error: 'MetaMask not installed' }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setState({
        provider,
        signer,
        address,
        chainId: Number(network.chainId),
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: err.message || 'Connection failed',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState(initialState);
  }, []);

  const switchToArbitrumSepolia = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARBITRUM_SEPOLIA_CONFIG.chainId }],
      });
    } catch (err: any) {
      // Chain not added — add it
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [ARBITRUM_SEPOLIA_CONFIG],
        });
      }
    }
  }, []);

  // Listen for account / chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setState(prev => ({ ...prev, address: accounts[0] }));
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      setState(prev => ({ ...prev, chainId: parseInt(chainIdHex, 16) }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect]);

  return (
    <WalletContext.Provider
      value={{ ...state, connect, disconnect, switchToArbitrumSepolia }}
    >
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

// ── Window type augmentation ──────────────────────────────────

declare global {
  interface Window {
    ethereum?: any;
  }
}
