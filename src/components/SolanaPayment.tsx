// src/components/SolanaPayment.tsx
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { QrCode, Clock, CheckCircle, XCircle, Loader2, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useWallet } from '@solana/wallet-adapter-react'

interface PaymentRequest {
  paymentId: string
  paymentUrl: string
  qrCode: string
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
  const { publicKey } = useWallet()
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)
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

      if (!response.ok) {
        throw new Error(data.error || 'Payment verification failed')
      }

      if (data.verified) {
        setVerificationStatus('verified')
        toast.success('Payment verified successfully!')
        onPaymentVerified(paymentRequest.paymentId)
      } else {
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
          <div
            className="inline-block p-4 bg-white rounded-lg"
            dangerouslySetInnerHTML={{ __html: paymentRequest.qrCode }}
          />
        </div>

        <Separator />

        {/* Payment Link */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Or click to pay:</p>
          <Button
            className="w-full"
            onClick={() => window.open(paymentRequest.paymentUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Payment Link
          </Button>
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

