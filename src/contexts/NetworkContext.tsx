// src/contexts/NetworkContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'

interface NetworkContextType {
  network: WalletAdapterNetwork
  setNetwork: (network: WalletAdapterNetwork) => void
  isDevnet: boolean
  isMainnet: boolean
  getExplorerUrl: (address: string) => string
  getRpcUrl: () => string
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

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  // Default to devnet for development
  const [network, setNetwork] = useState<WalletAdapterNetwork>(() => {
    const saved = localStorage.getItem('solana-network')
    return saved === 'mainnet-beta' ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet
  })

  // Save network preference to localStorage
  useEffect(() => {
    localStorage.setItem('solana-network', network)
  }, [network])

  const isDevnet = network === WalletAdapterNetwork.Devnet
  const isMainnet = network === WalletAdapterNetwork.Mainnet

  const getExplorerUrl = (address: string) => {
    const cluster = isDevnet ? '?cluster=devnet' : ''
    return `https://explorer.solana.com/address/${address}${cluster}`
  }

  const getRpcUrl = () => {
    if (isMainnet) {
      return process.env.VITE_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com'
    }
    return process.env.VITE_DEVNET_RPC_URL || 'https://api.devnet.solana.com'
  }

  const value: NetworkContextType = {
    network,
    setNetwork,
    isDevnet,
    isMainnet,
    getExplorerUrl,
    getRpcUrl
  }

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  )
}
