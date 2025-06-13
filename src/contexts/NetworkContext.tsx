// src/contexts/NetworkContext.tsx - Manual switching + mismatch detection
import React, { createContext, useContext, useEffect, useState } from 'react'
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
  network: WalletAdapterNetwork
  setNetwork: (network: WalletAdapterNetwork) => void
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({
  children,
  network,
  setNetwork
}) => {
  const isDevnet = network === WalletAdapterNetwork.Devnet
  const isMainnet = network === WalletAdapterNetwork.Mainnet

  const getExplorerUrl = (address: string) => {
    const cluster = isDevnet ? '?cluster=devnet' : ''
    return `https://explorer.solana.com/address/${address}${cluster}`
  }

  const getRpcUrl = () => {
    if (isMainnet) {
      return import.meta.env.VITE_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com'
    }
    return import.meta.env.VITE_DEVNET_RPC_URL || 'https://api.devnet.solana.com'
  }

  const { publicKey, connected } = useWallet()
  const [networkMismatch, setNetworkMismatch] = useState(false)

  useEffect(() => {
    const checkGenesisHash = async () => {
      try {
        const expectedHashes = {
          [WalletAdapterNetwork.Mainnet]: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          [WalletAdapterNetwork.Devnet]: '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
        }

        const connection = new Connection(getRpcUrl())
        const actualHash = await connection.getGenesisHash()
        const expectedHash = expectedHashes[network]
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
  }, [network, publicKey?.toBase58(), connected])

  const value: NetworkContextType = {
    network,
    setNetwork,
    isDevnet,
    isMainnet,
    getExplorerUrl,
    getRpcUrl,
    networkMismatch,
  }

  // console.log('🔍 NetworkContext:', value)

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  )
}
