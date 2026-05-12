import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, Loader2, Shield, X } from 'lucide-react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'
import { toast } from '@/components/ui/use-toast'
import { useNetwork } from '@/contexts/NetworkContext'

export interface EarthVaultCharacterPaymentResult {
  signature: string
  receiptId: number[]
  receiptIdHex: string
  receiptAddress: string
}

interface SimplePaymentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  characterData: any
  onPaymentSuccess: (result: EarthVaultCharacterPaymentResult) => void
  onCancel: () => void
}

const EARTH_VAULT_PROGRAM_ID = import.meta.env.VITE_EARTH_VAULT_PROGRAM_ID || 'J3jkrtAqnr7Vs6evka3wdugjdagwUJhGj3Mzae6wdABB'
const EARTH_VAULT_CONFIG_ADDRESS = import.meta.env.VITE_EARTH_VAULT_CONFIG_ADDRESS || 'CNmLSq3tNMafpShBQoscMq1XZc9VmExy2e94VRo1Y6Bv'
const CHARACTER_PAYMENT_DISCRIMINATOR = [0x21, 0x62, 0xa3, 0xba, 0x1c, 0x58, 0xad, 0xee]
const CHARACTER_RECEIPT_SEED = new TextEncoder().encode('character-mint-receipt')
const NFT_PRICE_SOL = 0.05

function publicKeyFromConfig(data: Uint8Array, offset: number): PublicKey {
  return new PublicKey(data.slice(offset, offset + 32))
}

function u64FromConfig(data: Uint8Array, offset: number): bigint {
  return new DataView(data.buffer, data.byteOffset + offset, 8).getBigUint64(0, true)
}

function writeU64LE(target: Uint8Array, offset: number, value: bigint) {
  new DataView(target.buffer, target.byteOffset + offset, 8).setBigUint64(0, value, true)
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function loadEarthVaultConfig(connection: ReturnType<typeof useConnection>['connection']) {
  const config = new PublicKey(EARTH_VAULT_CONFIG_ADDRESS)
  const account = await connection.getAccountInfo(config, 'confirmed')
  if (!account) {
    throw new Error('Earth Vault config is not initialized on this network')
  }

  const data = new Uint8Array(account.data)
  if (data.length < 235) throw new Error('Earth Vault config account is invalid')

  return {
    config,
    earthMint: publicKeyFromConfig(data, 40),
    daoTreasury: publicKeyFromConfig(data, 72),
    operationsWallet: publicKeyFromConfig(data, 104),
    reserveWallet: publicKeyFromConfig(data, 136),
    characterPriceLamports: u64FromConfig(data, 206),
  }
}

export const SimplePayment: React.FC<SimplePaymentProps> = ({ onPaymentSuccess, onCancel }) => {
  const { publicKey, sendTransaction, connected } = useWallet()
  const { connection } = useConnection()
  const { isDevnet } = useNetwork()
  const [paying, setPaying] = useState(false)
  const [result, setResult] = useState<EarthVaultCharacterPaymentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePayment = async () => {
    if (!publicKey || !sendTransaction) {
      toast.error('Connect wallet first')
      return
    }

    setPaying(true)
    setError(null)

    try {
      const programId = new PublicKey(EARTH_VAULT_PROGRAM_ID)
      const config = await loadEarthVaultConfig(connection)
      const receiptId = crypto.getRandomValues(new Uint8Array(32))
      const [receiptAddress] = PublicKey.findProgramAddressSync(
        [CHARACTER_RECEIPT_SEED, publicKey.toBuffer(), receiptId],
        programId
      )
      const earthEscrow = getAssociatedTokenAddressSync(
        config.earthMint,
        config.config,
        true,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      const data = new Uint8Array(8 + 32 + 8)
      data.set(CHARACTER_PAYMENT_DISCRIMINATOR, 0)
      data.set(receiptId, 8)
      writeU64LE(data, 40, config.characterPriceLamports)

      const transaction = new Transaction().add(new TransactionInstruction({
        programId,
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: config.config, isSigner: false, isWritable: true },
          { pubkey: config.earthMint, isSigner: false, isWritable: true },
          { pubkey: earthEscrow, isSigner: false, isWritable: true },
          { pubkey: config.daoTreasury, isSigner: false, isWritable: true },
          { pubkey: config.operationsWallet, isSigner: false, isWritable: true },
          { pubkey: config.reserveWallet, isSigner: false, isWritable: true },
          { pubkey: receiptAddress, isSigner: false, isWritable: true },
          { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      }))

      transaction.feePayer = publicKey
      const latest = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = latest.blockhash

      const signature = await sendTransaction(transaction, connection)
      const confirmation = await connection.confirmTransaction({ signature, ...latest }, 'confirmed')
      if (confirmation.value.err) {
        throw new Error(`Earth Vault payment failed: ${JSON.stringify(confirmation.value.err)}`)
      }

      const paymentResult = {
        signature,
        receiptId: Array.from(receiptId),
        receiptIdHex: toHex(receiptId),
        receiptAddress: receiptAddress.toBase58(),
      }
      setResult(paymentResult)
      toast.success(`Earth Vault receipt created: ${receiptAddress.toBase58().slice(0, 8)}…`)
      onPaymentSuccess(paymentResult)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Earth Vault payment failed'
      setError(message)
      toast.error(message)
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-background border border-primary/30 rounded-lg p-4 font-mono shadow-xl">
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-primary font-bold text-sm">EARTH_VAULT_PAYMENT</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={paying} className="h-7 w-7 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="bg-muted/20 border border-primary/10 rounded p-3 mb-4 text-xs space-y-2">
        <div className="flex justify-between"><span>NETWORK</span><span>{isDevnet ? 'DEVNET' : 'MAINNET'}</span></div>
        <div className="flex justify-between"><span>PRICE</span><span>{NFT_PRICE_SOL} SOL</span></div>
        <div className="flex justify-between"><span>PROGRAM</span><span>{EARTH_VAULT_PROGRAM_ID.slice(0, 8)}…</span></div>
        <div className="text-muted-foreground">Payment creates a replay-protected Earth Vault receipt. The server verifies and finalizes it after minting your character NFT.</div>
      </div>

      {error && (
        <div className="bg-red-950/20 border border-error/30 rounded p-3 mb-4 text-xs text-error flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="bg-green-950/20 border border-success/30 rounded p-3 mb-4 text-xs text-success space-y-1">
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> RECEIPT_CREATED</div>
          <div className="break-all text-muted-foreground">{result.receiptAddress}</div>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={paying} className="flex-1 font-mono">
          CANCEL
        </Button>
        <Button onClick={handlePayment} disabled={!connected || paying} className="flex-1 font-mono">
          {paying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> SIGNING</> : 'PAY_VAULT'}
        </Button>
      </div>
    </div>
  )
}

export default SimplePayment
