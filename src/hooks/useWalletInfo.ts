// src/hooks/useWalletInfo.ts
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useState, useEffect } from 'react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

export const useWalletInfo = () => {
  const { publicKey, connected, wallet } = useWallet()
  const { connection } = useConnection()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchBalance = async () => {
    if (!publicKey) {
      setBalance(null)
      return
    }

    setLoading(true)
    try {
      const balanceInLamports = await connection.getBalance(publicKey)
      setBalance(balanceInLamports / LAMPORTS_PER_SOL)
    } catch (error) {
      console.error('Error fetching balance:', error)
      setBalance(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance()
    } else {
      setBalance(null)
    }
  }, [connected, publicKey, connection])

  // Helper to get shortened address
  const shortAddress = publicKey
    ? `${publicKey.toString().slice(0, 8)}...${publicKey.toString().slice(-8)}`
    : null

  const fullAddress = publicKey ? publicKey.toString() : null

  return {
    connected,
    publicKey,
    wallet,
    balance,
    loading,
    refreshBalance: fetchBalance,
    shortAddress,
    fullAddress,
    walletName: wallet?.adapter.name || 'Unknown',
  }
}
