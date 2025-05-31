// hooks/useTokenMinter.ts
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Transaction, Keypair, SystemProgram } from '@solana/web3.js'
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { toast } from 'sonner'

interface TokenMetadata {
  name: string
  symbol: string
  description: string
  image?: string
  decimals: number
  initialSupply: number
  website?: string
  twitter?: string
  telegram?: string
  discord?: string
}

interface TokenResult {
  signature: string
  mintAddress: string
  tokenAccount: string
  metadata: TokenMetadata
}

export const useTokenMinter = () => {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()

  const mintToken = async (
    metadata: TokenMetadata
  ): Promise<TokenResult | null> => {
    if (!publicKey || !sendTransaction) {
      toast.error('Please connect your wallet first')
      return null
    }

    try {
      toast.info(`Creating ${metadata.name}...`)

      const mintKeypair = Keypair.generate()
      const lamports = await getMinimumBalanceForRentExemptMint(connection)
      const associatedTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey
      )

      // Use the Stack Exchange working example approach
      const mintAmount =
        metadata.initialSupply * Math.pow(10, metadata.decimals)

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          metadata.decimals,
          publicKey,
          publicKey
        ),
        createAssociatedTokenAccountInstruction(
          publicKey,
          associatedTokenAccount,
          publicKey,
          mintKeypair.publicKey
        ),
        createMintToInstruction(
          mintKeypair.publicKey,
          associatedTokenAccount,
          publicKey,
          mintAmount,
          [] // multisig signers - required parameter
        )
      )

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey
      transaction.partialSign(mintKeypair)

      const signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature, 'confirmed')

      toast.success(`${metadata.name} created!`)

      return {
        signature,
        mintAddress: mintKeypair.publicKey.toString(),
        tokenAccount: associatedTokenAccount.toString(),
        metadata,
      }
    } catch (error) {
      console.error('Failed:', error)
      toast.error('Token creation failed')
      throw error
    }
  }

  return {
    mintToken,
    connected: !!publicKey,
    minting: false,
  }
}
