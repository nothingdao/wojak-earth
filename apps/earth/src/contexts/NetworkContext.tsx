// src/contexts/NetworkContext.tsx - Fixed version
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection } from '@solana/web3.js'

interface NetworkContextType {
  network: WalletAdapterNetwork
  setNetwork: (network: WalletAdapterNetwork) => void
  isDevnet: boolean
  isMainnet: boolean
  getExplorerUrl: (address: string) => string
  getRpcUrl: () => string
  networkMismatch: boolean
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export const useNetwork = () => {
  const context = useContext(NetworkContext)
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider')
  }
  return context
}

interface NetworkProviderProps {
  children: React.ReactNode
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({
  children
}) => {
  // Internal state management for network
  const [network, setNetwork] = useState<WalletAdapterNetwork>(WalletAdapterNetwork.Devnet)

  const isDevnet = network === WalletAdapterNetwork.Devnet
  const isMainnet = network === WalletAdapterNetwork.Mainnet

  const getExplorerUrl = useCallback((address: string) => {
    const cluster = isDevnet ? '?cluster=devnet' : ''
    return `https://orb.helius.dev/address/${address}${cluster}`
  }, [isDevnet])

  const getRpcUrl = useCallback(() => {
    if (isMainnet) {
      return import.meta.env.VITE_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com'
    }
    return import.meta.env.VITE_DEVNET_RPC_URL || 'https://api.devnet.solana.com'
  }, [isMainnet])

  const { publicKey, connected } = useWallet()
  const [networkMismatch, setNetworkMismatch] = useState(false)

  useEffect(() => {
    const checkGenesisHash = async () => {
      try {
        // Fixed: Only include networks that exist in the type
        const expectedHashes: Record<WalletAdapterNetwork.Mainnet | WalletAdapterNetwork.Devnet, string> = {
          [WalletAdapterNetwork.Mainnet]: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          [WalletAdapterNetwork.Devnet]: '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
        }

        // Only check for networks we support
        if (network !== WalletAdapterNetwork.Mainnet && network !== WalletAdapterNetwork.Devnet) {
          setNetworkMismatch(false)
          return
        }

        const connection = new Connection(getRpcUrl())
        const actualHash = await connection.getGenesisHash()
        const expectedHash = expectedHashes[network as WalletAdapterNetwork.Mainnet | WalletAdapterNetwork.Devnet]
        setNetworkMismatch(actualHash !== expectedHash)
      } catch (err) {
        console.warn('⚠️ NetworkContext: Failed to detect network mismatch:', err)
        setNetworkMismatch(true)
      }
    }

    if (connected && publicKey) {
      checkGenesisHash()
    } else {
      setNetworkMismatch(false)
    }
  }, [network, publicKey, connected, getRpcUrl]) // Fixed: Added missing dependencies

  const value: NetworkContextType = {
    network,
    setNetwork,
    isDevnet,
    isMainnet,
    getExplorerUrl,
    getRpcUrl,
    networkMismatch,
  }

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  )
}
