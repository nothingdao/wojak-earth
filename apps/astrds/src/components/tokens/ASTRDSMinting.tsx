import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAction, useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { Id } from '../../../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { connection as solanaConnection } from '@/lib/solana'
import { buildClaimAstrdsTransaction, buildSettleAndClaimAstrdsTransaction, fetchPlayerEmission, sendSignedTransaction } from '@/lib/spaceVault'

const ASTRDSMinting: React.FC<{ tokenCount: number; gameSessionId?: string | null }> = ({
  tokenCount,
  gameSessionId,
}) => {
  const { publicKey, signTransaction, sendTransaction } = useWallet()
  const prepareSettlement = useAction(api.tokens.prepareSettlement)

  // Reactively watch session so we know when the game server has written astrdsEarned.
  const session = useQuery(
    api.gameSessions.get,
    gameSessionId ? { sessionId: gameSessionId as Id<'gameSessions'> } : 'skip'
  )
  const serverSettled = !gameSessionId || session?.astrdsEarned !== undefined || session?.astrdsEarnedRaw !== undefined

  const [status, setStatus] = useState<{
    loading: boolean
    error: string | null
    signature: string | null
  }>({ loading: false, error: null, signature: null })

  if (tokenCount <= 0) return null

  const handleClaim = async () => {
    if (!publicKey || !gameSessionId) return
    setStatus({ loading: true, error: null, signature: null })
    try {
      const tokenAmountRaw = BigInt(Math.round(tokenCount * 1_000_000_000))
      const playerEmission = await fetchPlayerEmission(solanaConnection, publicKey)
      const hasOnChainClaimable = (playerEmission?.claimableRaw ?? 0n) >= tokenAmountRaw

      const built = hasOnChainClaimable || session?.settlementTxSignature
        ? await buildClaimAstrdsTransaction({
            connection: solanaConnection,
            player: publicKey,
            amountRaw: tokenAmountRaw,
          })
        : await (async () => {
            const settlement = await prepareSettlement({
              playerWalletAddress: publicKey.toString(),
              gameSessionId,
            })
            return buildSettleAndClaimAstrdsTransaction({
              connection: solanaConnection,
              player: publicKey,
              settlement,
              claimAmountRaw: tokenAmountRaw,
            })
          })()

      let txSignature: string
      // Prefer signTransaction + sendRawTransaction so web3.js surfaces simulation logs.
      // Some standard-wallet sendTransaction implementations only emit WalletSendTransactionError.
      if (signTransaction) {
        const signed = await signTransaction(built.transaction)
        txSignature = await sendSignedTransaction({
          connection: solanaConnection,
          signedTransaction: signed,
          blockhash: built.blockhash,
          lastValidBlockHeight: built.lastValidBlockHeight,
        })
      } else if (sendTransaction) {
        txSignature = await sendTransaction(built.transaction, solanaConnection, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        })
        await solanaConnection.confirmTransaction(
          { signature: txSignature, blockhash: built.blockhash, lastValidBlockHeight: built.lastValidBlockHeight },
          'confirmed'
        )
      } else {
        throw new Error('Wallet does not support signing transactions')
      }

      setStatus({ loading: false, error: null, signature: txSignature })
    } catch (err) {
      console.error('ASTRDS claim failed', err)
      const details = err && typeof err === 'object' && 'logs' in err
        ? `: ${(err as { logs?: string[] }).logs?.join(' | ')}`
        : ''
      setStatus({
        loading: false,
        error: err instanceof Error ? `${err.message}${details}` : 'Claim failed',
        signature: null,
      })
    }
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-center gap-3'>
        <span className='text-muted-foreground text-sm'>Tokens collected</span>
        <Badge className='bg-primary/10 text-primary border-primary/40 font-mono text-base px-3 py-1'>
          {tokenCount} $ASTRDS
        </Badge>
      </div>

      <Button
        variant={status.signature ? 'ghost' : 'quarter'}
        size='lg'
        onClick={handleClaim}
        disabled={status.loading || !publicKey || !gameSessionId || !serverSettled || !!status.signature}
        className='w-full'
      >
        {!publicKey
          ? 'Connect wallet to claim'
          : !gameSessionId
            ? 'No session to claim'
            : !serverSettled
              ? 'Waiting for server...'
              : status.loading
                ? 'Settling...'
                : status.signature
                  ? 'Claimed!'
                  : `Claim ${tokenCount} $ASTRDS`}
      </Button>

      {status.error && (
        <p className='text-destructive text-sm text-center'>{status.error}</p>
      )}

      {status.signature && (
        <a
          href={`https://orbmarkets.io/tx/${status.signature}?cluster=devnet`}
          target='_blank'
          rel='noopener noreferrer'
          className='block text-center text-xs text-primary hover:underline'
        >
          View on Helius Orb ⇗
        </a>
      )}
    </div>
  )
}

export default ASTRDSMinting
