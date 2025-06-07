// src/components/SolanaPayment.tsx
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { QrCode, Clock, CheckCircle, XCircle, Loader2, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useNetwork } from '@/contexts/NetworkContext'
// Removed createQR import due to SVG parsing issues
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import BigNumber from 'bignumber.js'

interface PaymentRequest {
  paymentId: string
  paymentUrl: string
  amount: number
  treasuryWallet: string
  memo: string
  expiresAt: string
  message: string
}

interface SolanaPaymentProps {
  characterData: any
  onPaymentVerified: (paymentId: string) => void
  onCancel: () => void
}

export const SolanaPayment: React.FC<SolanaPaymentProps> = ({
  characterData,
  onPaymentVerified,
  onCancel
}) => {
  const { publicKey, sendTransaction, wallet } = useWallet()
  const { connection } = useConnection()
  const { getRpcUrl } = useNetwork()
  
  // Log RPC endpoints to check for mismatches
  console.log('🔗 SolanaPayment RPC URLs:', {
    connectionRpc: connection.rpcEndpoint,
    networkContextRpc: getRpcUrl()
  })
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)
  const [qrCodeHtml, setQrCodeHtml] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed'>('pending')

  // Create payment request
  const createPaymentRequest = async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet first')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/.netlify/functions/create-payment-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          characterData: characterData
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment request')
      }

      setPaymentRequest(data)
      toast.success('Payment request created! Please scan the QR code or click the payment link.')

      // Start countdown timer
      const expirationTime = new Date(data.expiresAt).getTime()
      const now = Date.now()
      setTimeLeft(Math.max(0, Math.floor((expirationTime - now) / 1000)))

    } catch (error: any) {
      console.error('Error creating payment request:', error)
      toast.error(error.message || 'Failed to create payment request')
    } finally {
      setLoading(false)
    }
  }

  // Verify payment with manual signature input
  const verifyPayment = async (signature?: string) => {
    if (!paymentRequest) return

    let txSignature = signature
    if (!txSignature) {
      txSignature = prompt('Please enter your transaction signature:')
      if (!txSignature) return
    }

    console.log('🔍 Starting payment verification:', {
      paymentId: paymentRequest.paymentId,
      signature: txSignature,
      automatic: !!signature
    })

    setVerifying(true)
    try {
      const response = await fetch('/.netlify/functions/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentId: paymentRequest.paymentId,
          signature: txSignature
        })
      })

      const data = await response.json()
      console.log('💰 Payment verification response:', data)

      if (!response.ok) {
        console.error('❌ Payment verification failed:', data)
        throw new Error(data.error || 'Payment verification failed')
      }

      if (data.verified) {
        console.log('✅ Payment verified successfully!')
        setVerificationStatus('verified')
        toast.success('Payment verified successfully! Creating character...')
        onPaymentVerified(paymentRequest.paymentId)
      } else {
        console.error('❌ Payment not verified:', data)
        throw new Error('Payment not verified')
      }

    } catch (error: any) {
      console.error('Error verifying payment:', error)
      toast.error(error.message || 'Payment verification failed')
      setVerificationStatus('failed')
    } finally {
      setVerifying(false)
    }
  }

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          toast.error('Payment request expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  // Generate QR code when payment request is available
  useEffect(() => {
    if (paymentRequest) {
      const generateQR = async () => {
        try {
          console.log('Creating QR code for URL:', paymentRequest.paymentUrl)
          
          // Use external QR service - more reliable than @solana/pay createQR
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentRequest.paymentUrl)}`
          const qrHtml = `<img src="${qrUrl}" alt="Payment QR Code" style="width: 300px; height: 300px; border-radius: 8px;" />`
          setQrCodeHtml(qrHtml)
          console.log('QR code generated successfully with external service')
          
        } catch (error) {
          console.error('Error generating QR code:', error)
          toast.error(`Failed to generate QR code: ${error.message}`)
        }
      }
      generateQR()
    }
  }, [paymentRequest])

  // Initial load - create payment request
  useEffect(() => {
    createPaymentRequest()
  }, [])

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Creating payment request...</p>
        </CardContent>
      </Card>
    )
  }

  if (!paymentRequest) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <XCircle className="w-8 h-8 text-destructive mx-auto mb-4" />
          <p className="mb-4">Failed to create payment request</p>
          <Button onClick={createPaymentRequest}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <QrCode className="w-5 h-5" />
          Pay with Solana
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {paymentRequest.message}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Payment Details */}
        <div className="bg-muted rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Amount:</span>
            <Badge variant="secondary" className="text-lg font-bold">
              {paymentRequest.amount} SOL
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Expires in:</span>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span className={`font-mono ${timeLeft < 300 ? 'text-destructive' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="text-center">
          <p className="text-sm font-medium mb-3">Scan with your Solana wallet:</p>
          {qrCodeHtml ? (
            <div 
              className="inline-block p-4 bg-white rounded-lg"
              dangerouslySetInnerHTML={{ __html: qrCodeHtml }}
            />
          ) : (
            <div className="inline-block p-4 bg-white rounded-lg w-64 h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
        </div>

        <Separator />

        {/* Payment Link */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Desktop Payment Options:</p>
          
          {/* Simplified payment buttons */}
          <div className="space-y-2">
            <Button 
              className="w-full" 
              onClick={() => {
                console.log('🔍 Direct wallet payment, URL:', paymentRequest.paymentUrl)
                
                // Use wallet adapter to send payment directly
                const handleDirectPayment = async () => {
                  try {
                    if (!publicKey || !sendTransaction) {
                      toast.error('Wallet not connected properly')
                      return
                    }
                    
                    // Extract recipient from payment request (we know it's the treasury wallet)
                    const recipient = new PublicKey(paymentRequest.treasuryWallet)
                    const amount = paymentRequest.amount
                    
                    console.log('💰 Direct payment details:', {
                      from: publicKey.toString(),
                      to: recipient.toString(),
                      amount: amount,
                      lamports: amount * LAMPORTS_PER_SOL
                    })
                    
                    // Debug connection details
                    console.log('🌐 Connection details:', {
                      rpcEndpoint: connection.rpcEndpoint,
                      commitment: 'confirmed'
                    })
                    
                    // Create transaction with Phantom-specific optimizations
                    const { blockhash } = await connection.getLatestBlockhash('confirmed')
                    console.log('🧱 Latest blockhash:', blockhash)
                    
                    // Check if this is Phantom wallet
                    const isPhantom = wallet?.adapter?.name?.toLowerCase().includes('phantom')
                    console.log('👻 Is Phantom wallet:', isPhantom)
                    
                    const transaction = new Transaction()
                    
                    if (isPhantom) {
                      // Phantom-specific transaction setup
                      console.log('👻 Using Phantom-optimized transaction structure')
                      
                      // Set transaction properties explicitly for Phantom
                      transaction.recentBlockhash = blockhash
                      transaction.feePayer = publicKey
                      
                      // Add transfer instruction with explicit parameters
                      const transferInstruction = SystemProgram.transfer({
                        fromPubkey: publicKey,
                        toPubkey: recipient,
                        lamports: Math.floor(amount * LAMPORTS_PER_SOL)
                      })
                      
                      transaction.add(transferInstruction)
                      
                      // Phantom sometimes needs the transaction to be "prepared" differently
                      try {
                        // Try to partially sign to validate the transaction structure
                        const testSig = await connection.simulateTransaction(transaction)
                        console.log('👻 Phantom transaction simulation:', testSig)
                      } catch (simError) {
                        console.warn('👻 Phantom simulation warning:', simError)
                      }
                      
                    } else {
                      // Standard transaction for other wallets (works with Solflare)
                      console.log('🔧 Using standard transaction structure')
                      transaction.recentBlockhash = blockhash
                      transaction.feePayer = publicKey
                      transaction.add(
                        SystemProgram.transfer({
                          fromPubkey: publicKey,
                          toPubkey: recipient,
                          lamports: Math.floor(amount * LAMPORTS_PER_SOL)
                        })
                      )
                    }
                    
                    console.log('📝 Transaction created with', transaction.instructions.length, 'instructions')
                    
                    toast.info('Sending payment...')
                    
                    // Send transaction
                    const signature = await sendTransaction(transaction, connection)
                    console.log('✅ Transaction sent:', signature)
                    
                    toast.success('Payment sent! Verifying...')
                    
                    // Auto-verify the payment
                    setTimeout(() => {
                      verifyPayment(signature)
                    }, 2000)
                    
                  } catch (error: any) {
                    console.error('❌ Payment failed:', error)
                    toast.error(`Payment failed: ${error.message}`)
                  }
                }
                
                handleDirectPayment()
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Pay with Connected Wallet
            </Button>
            
            {/* Alternative options */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                // Try to open with protocol handler
                window.location.href = paymentRequest.paymentUrl
              }}
            >
              Try Protocol Handler
            </Button>
            
            {/* Manual options */}
            <div className="flex gap-2">
              <Button 
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => copyToClipboard(paymentRequest.paymentUrl, 'Payment URL')}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy Link
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => window.open(paymentRequest.paymentUrl, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open Link
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 <strong>How to pay:</strong></p>
            <ul className="list-disc ml-4 space-y-1">
              <li><strong>Mobile:</strong> Scan QR code with Phantom/Solflare app</li>
              <li><strong>Desktop:</strong> Click "Open in Wallet App" or copy the link</li>
              <li><strong>Browser wallet:</strong> Copy link and paste in wallet's browser tab</li>
            </ul>
          </div>
        </div>

        <Separator />

        {/* Manual Verification */}
        <div className="space-y-3">
          <p className="text-sm font-medium">After paying, verify your payment:</p>
          <Button
            className="w-full"
            onClick={() => verifyPayment()}
            disabled={verifying || verificationStatus === 'verified'}
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : verificationStatus === 'verified' ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Payment Verified!
              </>
            ) : (
              'Verify Payment'
            )}
          </Button>
        </div>

        {/* Treasury Wallet Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Payment ID:
            <button
              onClick={() => copyToClipboard(paymentRequest.paymentId, 'Payment ID')}
              className="hover:text-foreground ml-1 underline"
            >
              {paymentRequest.paymentId}
            </button>
          </p>
          <p>Memo:
            <button
              onClick={() => copyToClipboard(paymentRequest.memo, 'Memo')}
              className="hover:text-foreground ml-1 underline"
            >
              {paymentRequest.memo}
            </button>
          </p>
        </div>

        {/* Cancel Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={onCancel}
          disabled={verifying}
        >
          Cancel
        </Button>
      </CardContent>
    </Card>
  )
}

export default SolanaPayment

