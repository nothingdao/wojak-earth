/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/BurnCharacter.tsx
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  getAccount,
  createBurnInstruction,           // For burning the token
  createCloseAccountInstruction    // For closing the account and reclaiming SOL

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
import { toast } from '@/components/ui/use-toast'
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

  // Debug to find where the token actually exists in your wallet
  const nukeCharacter = async () => {
    if (!character || !wallet.publicKey) {
      toast.error('Wallet not connected properly')
      return
    }

    setNuking(true)
    setShowConfirm(false)

    try {
      console.log('🔍 Searching ALL token accounts in your wallet...')
      console.log('Looking for mint:', character.nft_address)
      console.log('Your wallet:', wallet.publicKey.toString())

      const connection = new Connection(getRpcUrl(), "confirmed")
      const mintAddress = new PublicKey(character.nft_address)

      // Get ALL token accounts owned by your wallet
      const allTokenAccounts = await connection.getTokenAccountsByOwner(wallet.publicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      })

      console.log(`📋 Found ${allTokenAccounts.value.length} total token accounts in your wallet`)

      // Look for our specific token
      let foundTokenAccount = null
      let tokenBalance = 0n

      for (let i = 0; i < allTokenAccounts.value.length; i++) {
        const accountInfo = allTokenAccounts.value[i]
        try {
          const tokenData = await getAccount(connection, accountInfo.pubkey)

          console.log(`Token Account ${i + 1}:`, {
            address: accountInfo.pubkey.toBase58(),
            mint: tokenData.mint.toBase58(),
            balance: tokenData.amount.toString(),
            isOurToken: tokenData.mint.toBase58() === character.nft_address
          })

          // Check if this is our token
          if (tokenData.mint.toBase58() === character.nft_address) {
            foundTokenAccount = accountInfo.pubkey
            tokenBalance = tokenData.amount
            console.log('✅ FOUND OUR TOKEN!', {
              account: accountInfo.pubkey.toBase58(),
              balance: tokenBalance.toString()
            })
          }
        } catch (error) {
          console.log(`❌ Error reading token account ${i + 1}:`, error)
        }
      }

      if (!foundTokenAccount) {
        // Token not found in wallet - maybe check if it was never transferred?
        console.log('❌ Token not found in your wallet!')

        // Let's check if the mint exists at all
        const mintInfo = await connection.getAccountInfo(mintAddress)
        if (!mintInfo) {
          throw new Error('Token mint does not exist on Solana')
        }

        // Check ALL token accounts for this mint (regardless of owner)
        console.log('🔍 Checking ALL token accounts for this mint...')
        const allAccountsForMint = await connection.getTokenAccountsByOwner(
          new PublicKey('11111111111111111111111111111111'), // System program (will fail)
          { mint: mintAddress }
        ).catch(async () => {
          // Alternative approach - search programmatically
          const accounts = await connection.getProgramAccounts(
            new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            {
              filters: [
                { dataSize: 165 },
                { memcmp: { offset: 0, bytes: mintAddress.toBase58() } }
              ]
            }
          )
          return { value: accounts.map(acc => ({ pubkey: acc.pubkey, account: acc.account })) }
        })

        if (allAccountsForMint.value.length > 0) {
          console.log(`Found ${allAccountsForMint.value.length} accounts holding this token:`)
          for (const acc of allAccountsForMint.value) {
            const tokenData = await getAccount(connection, acc.pubkey)
            console.log('- Account:', acc.pubkey.toBase58(), 'Owner:', tokenData.owner.toBase58(), 'Balance:', tokenData.amount.toString())
          }
          throw new Error('Token exists but not in your wallet. It may still be owned by the minting server.')
        } else {
          throw new Error('Token does not exist anywhere on Solana')
        }
      }

      if (tokenBalance === 0n) {
        throw new Error('Found token account but balance is zero')
      }

      // Found the token! Now burn it
      console.log('🔥 Burning token from correct account...')
      console.log('🔍 Token balance debug:', {
        tokenBalance,
        tokenBalanceType: typeof tokenBalance,
        tokenBalanceString: tokenBalance.toString(),
        isBigInt: typeof tokenBalance === 'bigint'
      })

      /// Convert the bigint to a regular number for the instruction
      const tokenAmount = Number(tokenBalance)
      console.log('🔍 Converting balance:', {
        originalBalance: tokenBalance.toString(),
        convertedAmount: tokenAmount,
        willBurn: tokenAmount
      })

      const burnInstruction = new TransactionInstruction({
        keys: [
          { pubkey: foundTokenAccount, isSigner: false, isWritable: true },
          { pubkey: mintAddress, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        ],
        programId: TOKEN_PROGRAM_ID,
        data: Buffer.from([
          8, // Burn instruction discriminator
          1, 0, 0, 0, 0, 0, 0, 0  // Amount = 1 as little-endian u64
        ])
      })

      const closeInstruction = createCloseAccountInstruction(
        foundTokenAccount,
        wallet.publicKey,
        wallet.publicKey
      )

      const transaction = new Transaction()
      transaction.add(burnInstruction)
      transaction.add(closeInstruction)

      console.log('🚀 Sending burn transaction...')
      const signature = await wallet.sendTransaction(transaction, connection)

      await connection.confirmTransaction(signature, 'confirmed')
      console.log('✅ Token burned successfully!')

      toast.success(`🔥 Token burned: ${signature.slice(0, 8)}...`)

      // Database cleanup
      // Replace your database cleanup section with this debug version:
      console.log('🗑️ Cleaning up database...')
      const cleanupResponse = await fetch('/.netlify/functions/nuke-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: character.id,
          wallet_address: wallet.publicKey.toString(),
          burnSignature: signature
        })
      })

      console.log('📡 Backend response status:', cleanupResponse.status)
      console.log('📡 Backend response headers:', cleanupResponse.headers)

      // Get the raw response text first
      const responseText = await cleanupResponse.text()
      console.log('📡 Raw backend response:', responseText)

      // Try to parse as JSON
      let result
      try {
        result = JSON.parse(responseText)
        console.log('✅ Parsed JSON result:', result)
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError)
        console.log('📄 Response was not JSON, probably HTML error page')
        throw new Error(`Backend returned non-JSON response: ${responseText.slice(0, 200)}...`)
      }

      if (result.success) {
        toast.success(`🔥 ${character.name} completely destroyed!`)

        // Force app refresh to re-check character state
        setTimeout(() => {
          window.location.reload()
        }, 2000) // Give time for toast to show

        if (onCharacterCreated) onCharacterCreated()
      } else {
        throw new Error(result.error || 'Database cleanup failed')
      }

    } catch (error: unknown) {
      console.error('❌ Token search failed:', error)
      toast.error(`Failed to find/burn token: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
