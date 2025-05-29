"use client";

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';

interface SolanaWalletProviderProps {
  children: React.ReactNode;
  network?: WalletAdapterNetwork;
  endpoint?: string;
  autoConnect?: boolean;
}

export function SolanaWalletProvider({
  children,
  network = WalletAdapterNetwork.Devnet,
  endpoint,
  autoConnect = true,
}: SolanaWalletProviderProps) {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  const connectionEndpoint = useMemo(
    () => endpoint || clusterApiUrl(network),
    [network, endpoint]
  );

  return (
    <ConnectionProvider endpoint={connectionEndpoint}>
      <WalletProvider wallets={wallets} autoConnect={autoConnect}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
