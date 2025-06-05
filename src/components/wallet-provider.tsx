// Updated src/components/wallet-provider.tsx
"use client";

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { useNetwork } from '@/contexts/NetworkContext';

interface SolanaWalletProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
}

export function SolanaWalletProvider({
  children,
  autoConnect = true,
}: SolanaWalletProviderProps) {
  const { network, getRpcUrl } = useNetwork();

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  const endpoint = useMemo(() => {
    // Use custom RPC URL if available, otherwise fall back to default
    const customRpc = getRpcUrl();
    if (customRpc !== clusterApiUrl(network)) {
      return customRpc;
    }
    return clusterApiUrl(network);
  }, [network, getRpcUrl]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={autoConnect}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
