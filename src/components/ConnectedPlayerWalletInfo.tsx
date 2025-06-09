/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/BurnCharacter.tsx
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  getAccount
} from '@solana/spl-token'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import type { Character } from '@/types'
import { useNetwork } from '@/contexts/NetworkContext'

interface BurnCharacterProps {
  character: Character | null
  onCharacterCreated?: () => void
}

export const BurnCharacter: React.FC<BurnCharacterProps> = ({ character, onCharacterCreated }) => {
  const wallet = useWallet()
  const [nuking, setNuking] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { getRpcUrl } = useNetwork()

  const nukeCharacter = async () => {
    if (!character || !wallet.publicKey || !wallet.sendTransaction) {
      toast.error('Wallet not connected properly')
      return
    }

    if (!character.nftAddress) {
      toast.error('Character has no NFT to burn')
      return
    }

    setNuking(true)
    setShowConfirm(false)

    try {
      // 1. Set up Solana connection
      const connection = new Connection(getRpcUrl(), "confirmed")

      const mintAddress = new PublicKey(character.nftAddress)

      // Get the associated token account
      const tokenAccount = await getAssociatedTokenAddress(
        mintAddress,
        wallet.publicKey
      )

      console.log('Burning NFT:', character.nftAddress)
      console.log('Token account:', tokenAccount.toBase58())

      // Check if token account exists and has the token
      try {
        const tokenAccountInfo = await getAccount(connection, tokenAccount)

        if (tokenAccountInfo.amount === 0n) {
          throw new Error('No tokens in account to burn')
        }

        console.log('Token account balance:', tokenAccountInfo.amount.toString())
      } catch (error) {
        console.error('Token account error:', error)
        throw new Error('Token account not found or invalid')
      }

      // Create burn instruction manually (due to library version issues)
      const burnInstruction = new TransactionInstruction({
        keys: [
          { pubkey: tokenAccount, isSigner: false, isWritable: true },
          { pubkey: mintAddress, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        ],
        programId: TOKEN_PROGRAM_ID,
        data: Buffer.from([
          8, // Burn instruction discriminator
          1, 0, 0, 0, 0, 0, 0, 0, // Amount as little-endian u64 (1)
        ]),
      })

      // Create transaction
      const transaction = new Transaction()
      transaction.add(burnInstruction)

      // Get recent blockhash and set fee payer
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      transaction.feePayer = wallet.publicKey

      console.log('Sending burn transaction...')
      console.log('Wallet name:', wallet.wallet?.adapter?.name || 'Unknown')

      // Send transaction with retry logic for wallet compatibility
      let signature: string
      try {
        signature = await wallet.sendTransaction(transaction, connection, {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        })
      } catch (firstError) {
        console.warn('First attempt failed, retrying with different settings:', firstError)

        // For Magic Eden and other strict wallets, try signing first then sending
        const walletName = wallet.wallet?.adapter?.name?.toLowerCase() || ''
        if (walletName.includes('magic') || walletName.includes('eden')) {
          try {
            console.log('Trying Magic Eden compatible approach...')
            if (!wallet.signTransaction) {
              throw new Error('Wallet does not support signing transactions')
            }
            const signedTransaction = await wallet.signTransaction(transaction)
            signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
              skipPreflight: true,
              preflightCommitment: 'processed'
            })
          } catch (magicEdenError) {
            console.error('Magic Eden approach also failed:', magicEdenError)
            throw magicEdenError
          }
        } else {
          // Retry with less strict settings for other wallets
          signature = await wallet.sendTransaction(transaction, connection, {
            skipPreflight: true,
            preflightCommitment: 'processed'
          })
        }
      }

      console.log('Transaction sent:', signature)

      // Wait for confirmation with timeout
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed')

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
      }

      console.log('NFT burned successfully:', signature)

      // 2. Now tell the backend to clean up the database
      const cleanupResponse = await fetch('/.netlify/functions/nuke-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterId: character.id,
          walletAddress: wallet.publicKey.toString(),
          burnSignature: signature
        })
      })

      if (!cleanupResponse.ok) {
        throw new Error(`HTTP error! status: ${cleanupResponse.status}`)
      }

      const result = await cleanupResponse.json()

      if (result.success) {
        toast.success(`${character.name} has been permanently destroyed`)
        // Call the callback to refresh character data
        if (onCharacterCreated) {
          onCharacterCreated()
        } else {
          window.location.reload()
        }
      } else {
        throw new Error(result.error || 'Backend cleanup failed')
      }

    } catch (error: unknown) {
      console.error('Nuke failed:', error)
      let errorMessage = 'Unknown error'

      if (error instanceof Error) {
        errorMessage = error.message

        // Handle specific wallet errors
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction was cancelled by user'
        } else if (error.message.includes('insufficient')) {
          errorMessage = 'Insufficient funds for transaction fee'
        } else if (error.message.includes('blockhash')) {
          errorMessage = 'Transaction expired, please try again'
        }
      }

      toast.error(`Failed to burn NFT: ${errorMessage}`)
    } finally {
      setNuking(false)
    }
  }

  // Don't render anything if no character
  if (!character) {
    return null
  }

  return (
    <>
      <div className='bg-destructive/5 border border-destructive/20 rounded-lg p-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center'>
              <AlertTriangle className='w-4 h-4 text-destructive' />
            </div>
            <div>
              <div className='font-medium text-sm'>Danger Zone</div>
              <div className='text-xs text-muted-foreground'>Permanently destroy this character</div>
            </div>
          </div>

          <Button
            variant='destructive'
            size='sm'
            disabled={nuking}
            className='text-xs'
            onClick={() => setShowConfirm(true)}
          >
            {nuking ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Burning...
              </>
            ) : (
              <>
                <Trash2 className="w-3 h-3 mr-1" />
                Burn
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Simple Modal Overlay */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border rounded-lg shadow-lg max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h3 className="font-semibold">Destroy Character</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <p className="text-sm">
                This will permanently burn your NFT and delete <strong>{character.name}</strong> forever.
              </p>

              <div className="bg-destructive/5 border border-destructive/20 rounded p-3">
                <p className="text-xs text-muted-foreground mb-2">You will lose:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Character NFT (permanently burned)</li>
                  <li>• All character progress and stats</li>
                  <li>• Equipped items and inventory</li>
                  <li>• Character history and achievements</li>
                </ul>
              </div>

              <p className="text-xs text-destructive font-medium">
                This action cannot be undone.
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={nukeCharacter}
                className="flex-1"
              >
                Yes, Burn Forever
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
