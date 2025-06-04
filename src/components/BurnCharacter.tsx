/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/BurnCharacter.tsx
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  User,
  Trash2,
} from 'lucide-react'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import type { Character } from '@/types'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@radix-ui/react-alert-dialog'
import { AlertDialogFooter, AlertDialogHeader } from './ui/alert-dialog'

interface BurnCharacterProps {
  character: Character | null
  onCharacterCreated?: () => void
}

export const BurnCharacter: React.FC<BurnCharacterProps> = ({ character, onCharacterCreated }) => {
  const wallet = useWallet()
  const [nuking, setNuking] = useState(false)

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
      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed"
      )

      const mintAddress = new PublicKey(character.nftAddress)

      // Get the associated token account
      const tokenAccount = await getAssociatedTokenAddress(
        mintAddress,
        wallet.publicKey
      )

      console.log('Burning NFT:', character.nftAddress)
      console.log('Token account:', tokenAccount.toBase58())

      // Create burn instruction manually with Uint8Array
      const burnData = new Uint8Array(9)
      burnData[0] = 8 // Burn instruction

      // Write amount as 8 bytes little endian
      const amount = BigInt(1)
      const view = new DataView(burnData.buffer, 1, 8)
      view.setBigUint64(0, amount, true) // little endian

      const burnInstruction = new TransactionInstruction({
        keys: [
          { pubkey: tokenAccount, isSigner: false, isWritable: true },
          { pubkey: mintAddress, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        ],
        programId: TOKEN_PROGRAM_ID,
        data: Buffer.from(burnData),
      })

      // Create transaction
      const transaction = new Transaction().add(burnInstruction)

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = wallet.publicKey

      // Send transaction
      const signature = await wallet.sendTransaction(transaction, connection)

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')

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
        throw new Error(result.error)
      }

    } catch (error: unknown) {
      console.error('Nuke failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
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
