// src/components/SimplePayment.tsx
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Zap,
  CheckCircle,
  AlertTriangle,
  Database,
  Activity,
  Shield,
  Coins,
  Terminal,
  RefreshCw,
  WifiOff
} from 'lucide-react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { toast } from '@/components/ui/use-toast'
import { useNetwork } from '@/contexts/NetworkContext'

interface SimplePaymentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  characterData: any
  onPaymentSuccess: (signature: string) => void
  onCancel: () => void
}

// Network-specific treasury wallets
const TREASURY_WALLETS = {
  devnet: import.meta.env.VITE_TREASURY_WALLET_ADDRESS || '6cfjMdM6yNJQfZRDx25hLUsR8PFFhh4Xb5bdxHPBtoa4',
  mainnet: import.meta.env.VITE_TREASURY_WALLET_ADDRESS || '6cfjMdM6yNJQfZRDx25hLUsR8PFFhh4Xb5bdxHPBtoa4'
}

const NFT_PRICE = 0.05 // SOL - Match backend expectation

// Validate and create treasury pubkey ONCE
let treasuryPubkey: PublicKey
let treasuryValidationError: string | null = null

try {
  // We'll initialize this in the component based on network
  treasuryPubkey = new PublicKey(TREASURY_WALLETS.devnet)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (error) {
  console.error('❌ Invalid treasury wallet address:', TREASURY_WALLETS.devnet)
  treasuryValidationError = 'Invalid treasury wallet configuration'
}

export const SimplePayment: React.FC<SimplePaymentProps> = ({
  onPaymentSuccess,
  onCancel
}) => {
  const { publicKey, sendTransaction, wallet } = useWallet()
  const { connection } = useConnection()
  const { isDevnet } = useNetwork()
  const [paying, setPaying] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  // Initialize treasury pubkey based on network
  useEffect(() => {
    try {
      const treasuryAddress = isDevnet ? TREASURY_WALLETS.devnet : TREASURY_WALLETS.mainnet
      treasuryPubkey = new PublicKey(treasuryAddress)
      setConfigError(null)
    } catch (error) {
      console.error('❌ Invalid treasury wallet address:', error)
      setConfigError('Invalid treasury wallet configuration')
    }
  }, [isDevnet])

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

    console.log('🔍 Payment Debug Info:', {
      senderWallet: publicKey.toString(),
      treasuryWallet: treasuryPubkey.toString(),
      nftPrice: NFT_PRICE,
      walletAdapter: wallet?.adapter?.name,
      connection: connection.rpcEndpoint,
      network: isDevnet ? 'devnet' : 'mainnet'
    })

    // Check wallet balance first with detailed logging
    try {
      console.log('💰 Checking wallet balance...')
      const balance = await connection.getBalance(publicKey)
      const balanceSOL = balance / LAMPORTS_PER_SOL
      const requiredLamports = Math.floor(NFT_PRICE * LAMPORTS_PER_SOL)
      const requiredSOL = requiredLamports / LAMPORTS_PER_SOL
      const estimatedFee = 5000 // Rough estimate for transaction fee
      const estimatedFeeSOL = estimatedFee / LAMPORTS_PER_SOL

      console.log('💰 Balance Check:', {
        currentBalance: balanceSOL,
        requiredAmount: requiredSOL,
        estimatedFee: estimatedFeeSOL,
        totalNeeded: requiredSOL + estimatedFeeSOL,
        hasSufficientFunds: balance >= requiredLamports + estimatedFee
      })

      if (balance < requiredLamports + estimatedFee) {
        const errorMsg = `Insufficient SOL. Need ${NFT_PRICE} SOL + fees (${estimatedFeeSOL.toFixed(4)}), have ${balanceSOL.toFixed(4)} SOL`
        toast.error(errorMsg)
        console.error('❌ Insufficient balance:', errorMsg)
        return
      }

      console.log('✅ Balance check passed')
    } catch (error) {
      console.error('❌ Failed to check balance:', error)
      toast.error('Failed to check wallet balance')
      return
    }

    console.log('💰 Starting payment transaction...')
    setPaying(true)

    try {
      // Validate accounts before creating transaction
      console.log('🔍 Validating accounts...')

      // Check if accounts exist on the network
      const [senderInfo, treasuryInfo] = await Promise.all([
        connection.getAccountInfo(publicKey),
        connection.getAccountInfo(treasuryPubkey)
      ])

      console.log('📊 Account Info:', {
        senderExists: !!senderInfo,
        senderOwner: senderInfo?.owner?.toString(),
        treasuryExists: !!treasuryInfo,
        treasuryOwner: treasuryInfo?.owner?.toString()
      })

      // Get fresh blockhash first
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')

      // Create transaction with validation
      console.log('📝 Creating transaction...')
      const transaction = new Transaction()

      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: treasuryPubkey,
        lamports: Math.floor(NFT_PRICE * LAMPORTS_PER_SOL)
      })

      transaction.add(transferInstruction)

      console.log('📝 Transaction Details:', {
        instructions: transaction.instructions.length,
        lamports: Math.floor(NFT_PRICE * LAMPORTS_PER_SOL),
        feePayer: transaction.feePayer?.toString(),
        recentBlockhash: transaction.recentBlockhash,
        fromPubkey: transferInstruction.keys[0].pubkey.toString(),
        toPubkey: transferInstruction.keys[1].pubkey.toString()
      })

      // Simulate transaction first
      console.log('🧪 Simulating transaction...')
      try {
        const simulation = await connection.simulateTransaction(transaction)
        console.log('🧪 Simulation Result:', {
          err: simulation.value.err,
          logs: simulation.value.logs?.slice(0, 3) // First 3 logs
        })

        if (simulation.value.err) {
          throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`)
        }
      } catch (simError) {
        console.error('❌ Transaction simulation failed:', simError)
        // Continue anyway, sometimes simulation fails but transaction works
      }

      // Send transaction with enhanced error handling
      console.log('🚀 Sending transaction...')
      const txSignature = await sendTransaction(transaction, connection)

      console.log('✅ Transaction sent successfully:', {
        signature: txSignature,
        explorer: `https://explorer.solana.com/tx/${txSignature}?cluster=${isDevnet ? 'devnet' : 'mainnet'}`
      })

      setSignature(txSignature)
      toast.success(`Payment sent! TX: ${txSignature.slice(0, 8)}...`)

      // Wait for confirmation
      console.log('⏳ Waiting for confirmation...')
      setVerifying(true)

      const confirmation = await connection.confirmTransaction({
        signature: txSignature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed')

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
      }

      console.log('✅ Transaction confirmed:', {
        signature: txSignature,
        slot: confirmation.context.slot
      })

      // Small delay to ensure backend can verify
      setTimeout(() => {
        setVerifying(false)
        onPaymentSuccess(txSignature)
      }, 1000)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('❌ Payment failed with detailed error:', {
        error,
        errorMessage: error.message,
        errorCode: error.code,
        errorName: error.name,
        stack: error.stack?.split('\n').slice(0, 3) // First 3 stack lines
      })

      setPaying(false)
      setVerifying(false)

      // Handle specific error cases
      if (error.name === 'WalletSendTransactionError') {
        if (error.message.includes('Invalid account')) {
          toast.error('Treasury wallet not initialized on this network')
        } else {
          toast.error('Transaction failed: ' + error.message)
        }
      } else {
        toast.error('Payment failed: ' + error.message)
      }
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
      <div className="w-full max-w-md mx-auto bg-background border border-error/50 rounded-lg p-4 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-3 border-b border-error/30 pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-error" />
            <span className="text-error font-bold text-sm">CONFIG_ERROR v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <WifiOff className="w-3 h-3 text-error" />
            <span className="text-error text-xs">BLOCKED</span>
          </div>
        </div>

        {/* Error Display */}
        <div className="bg-red-950/20 border border-error/30 rounded p-3 mb-3">
          <div className="text-center">
            <div className="text-error text-2xl mb-2">🚨</div>
            <div className="text-error font-bold mb-1">TREASURY_WALLET_CONFLICT</div>
            <div className="text-red-400 text-xs">
              CONNECTED_WALLET_MATCHES_TREASURY
            </div>
          </div>
        </div>

        {/* Debug Info */}
        {publicKey && treasuryPubkey && (
          <div className="bg-muted/20 border border-error/10 rounded p-2 mb-3">
            <div className="text-xs text-red-400 font-mono">
              <div className="text-error text-xs font-bold mb-1">[WALLET_ANALYSIS]</div>
              <div className="text-muted-foreground">SENDER:</div>
              <div className="text-red-400 break-all text-xs">{publicKey.toString()}</div>
              <div className="text-muted-foreground mt-1">TREASURY:</div>
              <div className="text-red-400 break-all text-xs">{treasuryPubkey.toString()}</div>
              <div className="text-center text-error font-bold mt-2">CONFLICT_DETECTED</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full font-mono text-xs h-7"
        >
          <Terminal className="w-3 h-3 mr-1" />
          CANCEL_AND_SWITCH_WALLET
        </Button>

        {/* Footer */}
        <div className="text-xs text-red-400/60 font-mono text-center border-t border-error/20 pt-2 mt-3">
          PAYMENT_SYSTEM_v2089 | DEV_ERROR_DETECTED
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto bg-background border border-primary/30 rounded-lg p-4 font-mono">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-3 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-primary font-bold text-sm">PAYMENT_PROCESSOR v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 animate-pulse" />
          <span className="text-primary text-xs">READY</span>
        </div>
      </div>

      {/* Payment Header */}
      <div className="bg-muted/30 border border-primary/20 rounded p-3 mb-3">
        <div className="text-center">
          <div className="text-primary font-bold mb-1">PLAYER_NFT_MINTING</div>
          <div className="text-muted-foreground text-xs">
            ONE_TIME_PAYMENT_REQUIRED
          </div>
        </div>
      </div>

      {/* Price Display */}
      <div className="bg-muted/20 border border-primary/10 rounded p-3 mb-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-primary" />
            <span className="text-primary font-bold text-xl">{NFT_PRICE}_SOL</span>
          </div>
          <div className="text-muted-foreground text-xs font-mono">
            MINTING_COST_FIXED_RATE
          </div>
        </div>
      </div>

      {/* Wallet Info */}
      <div className="bg-muted/20 border border-primary/10 rounded p-2 mb-3">
        <div className="text-xs text-muted-foreground font-mono">
          <div className="text-primary text-xs font-bold mb-1">[TRANSACTION_DETAILS]</div>
          <div>WALLET: {wallet?.adapter?.name?.toUpperCase()}</div>
          <div>DESTINATION: {treasuryPubkey?.toString().slice(0, 8)}...{treasuryPubkey?.toString().slice(-8)}</div>
          <div>NETWORK: {isDevnet ? 'devnet' : 'mainnet'}</div>
        </div>
      </div>

      {/* Payment Status */}
      {signature && (
        <div className="bg-muted/30 border border-primary/20 rounded p-3 mb-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {verifying ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <CheckCircle className="w-4 h-4 text-success" />
              )}
              <span className="text-primary font-bold text-sm">
                {verifying ? 'CONFIRMING_PAYMENT...' : 'PAYMENT_CONFIRMED'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground font-mono bg-muted/20 border border-primary/10 rounded p-1">
              TX: {signature.slice(0, 8)}...{signature.slice(-8)}
            </div>

            {/* Retry button if verification failed */}
            {!verifying && signature && (
              <Button
                variant="ghost"
                size="sm"
                onClick={retryVerification}
                className="mt-2 text-xs font-mono h-6"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                RETRY_CREATION
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Action Button */}
      <div className="space-y-2 mb-3">
        <Button
          onClick={handlePayment}
          disabled={paying || verifying || !!signature}
          className="w-full font-mono text-xs h-8"
          size="lg"
        >
          {paying ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              PROCESSING_PAYMENT...
            </>
          ) : verifying ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              CONFIRMING_TRANSACTION...
            </>
          ) : signature ? (
            <>
              <CheckCircle className="w-3 h-3 mr-2" />
              PAYMENT_COMPLETE
            </>
          ) : (
            <>
              <Coins className="w-3 h-3 mr-2" />
              PAY_{NFT_PRICE}_SOL_&_CREATE_PLAYER
            </>
          )}
        </Button>

        {/* Cancel Button */}
        {!signature && (
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={paying || verifying}
            className="w-full font-mono text-xs h-7"
          >
            <Terminal className="w-3 h-3 mr-1" />
            CANCEL_OPERATION
          </Button>
        )}
      </div>

      {/* Success Message */}
      {signature && !verifying && (
        <div className="bg-green-950/20 border border-success/30 rounded p-2 mb-3">
          <div className="text-center text-green-400 text-xs font-mono">
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-3 h-3" />
              <span>PAYMENT_VERIFIED_SUCCESSFULLY</span>
            </div>
            <div className="text-success/80 mt-1">CREATING_PLAYER_PROFILE...</div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-primary/20 pt-2">
        PAYMENT_SYSTEM_v2089 | SECURE_BLOCKCHAIN_TRANSACTION
      </div>
    </div>
  )
}

export default SimplePayment
