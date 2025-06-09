// src/components/SimplePayment.tsx - Enhanced Error Display
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Coins, CheckCircle, AlertTriangle, Settings } from 'lucide-react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { toast } from 'sonner'

interface SimplePaymentProps {
  characterData: any
  onPaymentSuccess: (signature: string) => void
  onCancel: () => void
}

const TREASURY_WALLET = import.meta.env.VITE_TREASURY_WALLET_ADDRESS || 'YourTreasuryWalletHere'
const NFT_PRICE = 0.01 // SOL - FIXED: Match backend expectation

// Validate and create treasury pubkey ONCE
let treasuryPubkey: PublicKey
let treasuryValidationError: string | null = null

try {
  treasuryPubkey = new PublicKey(TREASURY_WALLET)
} catch (error) {
  console.error('❌ Invalid treasury wallet address:', TREASURY_WALLET)
  treasuryValidationError = 'Invalid treasury wallet configuration'
}

export const SimplePayment: React.FC<SimplePaymentProps> = ({
  onPaymentSuccess,
  onCancel
}) => {
  const { publicKey, sendTransaction, wallet } = useWallet()
  const { connection } = useConnection()
  const [paying, setPaying] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  // Check for configuration issues when wallet connects
  useEffect(() => {
    if (publicKey && treasuryPubkey) {
      if (publicKey.toString() === treasuryPubkey.toString()) {
        setConfigError('🚨 Dev Error: Cannot test payments with the treasury wallet')
      } else {
        setConfigError(null)
      }
    }
  }, [publicKey])

  const handlePayment = async () => {
    if (!publicKey || !sendTransaction) {
      toast.error('Wallet not connected')
      return
    }

    // Check for treasury validation error
    if (treasuryValidationError) {
      setConfigError(treasuryValidationError)
      toast.error(treasuryValidationError)
      return
    }

    // CRITICAL: Check that we're not sending to ourselves
    if (publicKey.toString() === treasuryPubkey.toString()) {
      const errorMsg = '🚨 Dev Error: Cannot test payments with the treasury wallet'
      setConfigError(errorMsg)
      toast.error(errorMsg)
      console.error('❌ Treasury wallet same as sender wallet:', {
        sender: publicKey.toString(),
        treasury: treasuryPubkey.toString()
      })
      return
    }

    // Check wallet balance first
    try {
      const balance = await connection.getBalance(publicKey)
      const requiredLamports = Math.floor(NFT_PRICE * LAMPORTS_PER_SOL)
      const estimatedFee = 5000 // Rough estimate for transaction fee

      if (balance < requiredLamports + estimatedFee) {
        toast.error(`Insufficient SOL. Need ${NFT_PRICE} SOL + fees, have ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`)
        return
      }
    } catch (error) {
      console.error('Failed to check balance:', error)
      toast.error('Failed to check wallet balance')
      return
    }

    console.log('💰 Starting payment:', {
      from: publicKey.toString(),
      to: treasuryPubkey.toString(),
      amount: NFT_PRICE,
      wallet: wallet?.adapter?.name
    })

    setPaying(true)
    try {
      // Get fresh blockhash with confirmed commitment
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: publicKey
      })

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasuryPubkey,
          lamports: Math.floor(NFT_PRICE * LAMPORTS_PER_SOL)
        })
      )

      console.log('📝 Transaction created:', {
        instructions: transaction.instructions.length,
        lamports: Math.floor(NFT_PRICE * LAMPORTS_PER_SOL),
        blockhash,
        lastValidBlockHeight
      })

      // Send transaction with better error handling
      const txSignature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      })

      console.log('✅ Payment sent:', txSignature)
      setSignature(txSignature)
      toast.success('Payment sent! Verifying...')

      // Wait for confirmation before proceeding
      setVerifying(true)

      // Wait for transaction confirmation
      const confirmation = await connection.confirmTransaction({
        signature: txSignature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed')

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`)
      }

      console.log('✅ Payment confirmed:', txSignature)
      toast.success('Payment confirmed! Creating character...')

      // Small delay to ensure backend can verify
      setTimeout(() => {
        setVerifying(false)
        onPaymentSuccess(txSignature)
      }, 1000)

    } catch (error: any) {
      console.error('❌ Payment failed:', error)
      setSignature(null)
      setVerifying(false)

      let errorMessage = 'Payment failed'
      if (error.message?.includes('User rejected')) {
        errorMessage = 'Transaction was cancelled'
      } else if (error.message?.includes('insufficient')) {
        errorMessage = 'Insufficient SOL balance'
      } else if (error.message?.includes('blockhash')) {
        errorMessage = 'Transaction expired, please try again'
      } else if (error.message?.includes('0x1')) {
        errorMessage = 'Insufficient funds for transaction'
      } else if (error.message) {
        errorMessage = error.message
      }

      toast.error(errorMessage)
    } finally {
      setPaying(false)
    }
  }

  const retryVerification = () => {
    if (signature) {
      setVerifying(true)
      setTimeout(() => {
        setVerifying(false)
        onPaymentSuccess(signature)
      }, 1000)
    }
  }

  // If there's a configuration error, show it prominently
  if (configError || treasuryValidationError) {
    return (
      <Card className="w-full max-w-md mx-auto border-yellow-200 dark:border-yellow-800">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-yellow-600">
            <AlertTriangle className="w-5 h-5" />
            Dev Configuration Error
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Display */}
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  🚨 Developer Warning
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                  You're using the treasury wallet to test payments. Switch to a different wallet or update your treasury address.
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 font-mono bg-yellow-100 dark:bg-yellow-900 p-2 rounded">
                  Treasury wallet cannot be the same as your connected wallet
                </div>
              </div>
            </div>
          </div>

          {/* Debug Info */}
          {publicKey && treasuryPubkey && (
            <div className="text-xs bg-muted rounded p-3 space-y-2 font-mono">
              <div>
                <span className="text-muted-foreground">Connected Wallet:</span>
                <br />
                <span className="text-red-600">{publicKey.toString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Treasury Wallet:</span>
                <br />
                <span className="text-red-600">{treasuryPubkey.toString()}</span>
              </div>
              <div className="text-center text-red-600 font-bold">
                ↑ These are the same! ↑
              </div>
            </div>
          )}

          {/* Actions */}
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full"
          >
            Cancel & Switch Wallet
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Coins className="w-5 h-5" />
          Pay to Create Character
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          One-time payment to mint your character NFT
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Display */}
        <div className="text-center bg-muted rounded-lg p-4">
          <div className="text-3xl font-bold">{NFT_PRICE} SOL</div>
          <div className="text-sm text-muted-foreground">
            Character NFT minting cost
          </div>
        </div>

        {/* Wallet Info */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
          <div>Wallet: {wallet?.adapter?.name}</div>
          <div>To: {treasuryPubkey?.toString().slice(0, 20)}...{treasuryPubkey?.toString().slice(-10)}</div>
        </div>

        {/* Payment Status */}
        {signature && (
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {verifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
              <span className="text-sm font-medium">
                {verifying ? 'Confirming Payment...' : 'Payment Confirmed!'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {signature.slice(0, 20)}...{signature.slice(-20)}
            </div>

            {/* Retry button if verification failed */}
            {!verifying && signature && (
              <Button
                variant="ghost"
                size="sm"
                onClick={retryVerification}
                className="mt-2 text-xs"
              >
                Retry Creation
              </Button>
            )}
          </div>
        )}

        {/* Main Action Button */}
        <Button
          onClick={handlePayment}
          disabled={paying || verifying || !!signature}
          className="w-full"
          size="lg"
        >
          {paying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending Payment...
            </>
          ) : verifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Confirming Payment...
            </>
          ) : signature ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Payment Complete
            </>
          ) : (
            <>
              <Coins className="w-4 h-4 mr-2" />
              Pay {NFT_PRICE} SOL & Create Character
            </>
          )}
        </Button>

        {/* Cancel Button */}
        {!signature && (
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={paying || verifying}
            className="w-full"
          >
            Cancel
          </Button>
        )}

        {/* Success Message */}
        {signature && !verifying && (
          <div className="text-center text-sm text-green-600 bg-green-50 dark:bg-green-950 p-2 rounded">
            🎉 Payment confirmed! Creating your character...
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SimplePayment
