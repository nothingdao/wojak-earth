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
} from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import type { Character } from '@/types'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@radix-ui/react-alert-dialog'
import { AlertDialogFooter, AlertDialogHeader } from './ui/alert-dialog'
import { useNetwork } from '@/contexts/NetworkContext'

interface BurnCharacterProps {
  character: Character | null
  onCharacterCreated?: () => void
}

export const BurnCharacter: React.FC<BurnCharacterProps> = ({ character, onCharacterCreated }) => {
  const wallet = useWallet()
  const [nuking, setNuking] = useState(false)
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

  return (
    <div className='space-y-6'>
      {/* Character exists - show existing character nuke section */}
      {character && (
        <div className='bg-card border rounded-lg p-6'>
          <div className=''>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant='destructive'
                  size='sm'
                  disabled={nuking}
                >
                  {nuking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Burning...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Burn Character
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Permanently Destroy Character?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently burn your NFT and delete {character?.name} forever.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={nukeCharacter}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Burn Forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  )
}
