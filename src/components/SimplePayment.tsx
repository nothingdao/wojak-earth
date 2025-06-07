// src/components/SimplePayment.tsx - FUCK SOLANA PAY VERSION
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Coins, CheckCircle } from 'lucide-react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { toast } from 'sonner'

interface SimplePaymentProps {
  characterData: any
  onPaymentSuccess: (signature: string) => void
  onCancel: () => void
}

const TREASURY_WALLET = import.meta.env.VITE_TREASURY_WALLET_ADDRESS || 'YourTreasuryWalletHere'
const NFT_PRICE = 0.1 // SOL

export const SimplePayment: React.FC<SimplePaymentProps> = ({
  characterData,
  onPaymentSuccess,
  onCancel
}) => {
  const { publicKey, sendTransaction, wallet } = useWallet()
  const { connection } = useConnection()
  const [paying, setPaying] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)

  const handlePayment = async () => {
    if (!publicKey || !sendTransaction) {
      toast.error('Wallet not connected')
      return
    }

    console.log('💰 Starting simple payment:', {
      from: publicKey.toString(),
      to: TREASURY_WALLET,
      amount: NFT_PRICE,
      wallet: wallet?.adapter?.name
    })

    setPaying(true)
    try {
      // Create simple transfer transaction
      const { blockhash } = await connection.getLatestBlockhash('confirmed')

      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: publicKey
      })

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(TREASURY_WALLET),
          lamports: Math.floor(NFT_PRICE * LAMPORTS_PER_SOL)
        })
      )

      console.log('📝 Transaction created:', {
        instructions: transaction.instructions.length,
        lamports: Math.floor(NFT_PRICE * LAMPORTS_PER_SOL)
      })

      // Send transaction
      const txSignature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      })

      console.log('✅ Payment sent:', txSignature)
      setSignature(txSignature)
      toast.success('Payment sent! Verifying...')

      // Auto-verify after sending
      setTimeout(() => verifyAndProceed(txSignature), 2000)

    } catch (error: any) {
      console.error('❌ Payment failed:', error)

      let errorMessage = 'Payment failed'
      if (error.message?.includes('User rejected')) {
        errorMessage = 'Transaction was cancelled'
      } else if (error.message?.includes('insufficient')) {
        errorMessage = 'Insufficient SOL balance'
      } else if (error.message?.includes('blockhash')) {
        errorMessage = 'Transaction expired, please try again'
      }

      toast.error(errorMessage)
    } finally {
      setPaying(false)
    }
  }

  const verifyAndProceed = async (txSignature: string) => {
    setVerifying(true)
    try {
      console.log('🔍 Verifying payment:', txSignature)

      // Wait a bit for confirmation
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check transaction exists and succeeded
      const transaction = await connection.getTransaction(txSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      })

      if (!transaction) {
        throw new Error('Transaction not found. Please wait and try again.')
      }

      if (transaction.meta?.err) {
        throw new Error('Transaction failed on blockchain')
      }

      console.log('✅ Payment verified on-chain')
      toast.success('Payment verified! Creating character...')

      // Call success callback with signature
      onPaymentSuccess(txSignature)

    } catch (error: any) {
      console.error('❌ Verification failed:', error)
      toast.error(`Verification failed: ${error.message}`)

      // Allow manual retry
      setVerifying(false)
    }
  }

  const retryVerification = () => {
    if (signature) {
      verifyAndProceed(signature)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Coins className="w-5 h-5" />
          Pay to Create Character
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Simple one-click payment - no QR codes needed!
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Display */}
        <div className="text-center bg-muted rounded-lg p-4">
          <div className="text-3xl font-bold">{NFT_PRICE} SOL</div>
          <div className="text-sm text-muted-foreground">
            One-time payment to mint your character NFT
          </div>
        </div>

        {/* Wallet Info */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
          <div>Wallet: {wallet?.adapter?.name}</div>
          <div>To: {TREASURY_WALLET.slice(0, 20)}...{TREASURY_WALLET.slice(-10)}</div>
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
                {verifying ? 'Verifying Payment...' : 'Payment Verified!'}
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
                Retry Verification
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
            🎉 Payment successful! Your character is being created...
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SimplePayment
