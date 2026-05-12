import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { createHash } from 'crypto'

export const DEFAULT_EARTH_VAULT_PROGRAM_ID = 'J3jkrtAqnr7Vs6evka3wdugjdagwUJhGj3Mzae6wdABB'

const CHARACTER_MINT_RECEIPT_SEED = Buffer.from('character-mint-receipt')
const DISCRIMINATOR_SIZE = 8
const RECEIPT_SIZE = 98
const FINALIZE_RECEIPT_DISCRIMINATOR = createHash('sha256')
  .update('global:finalize_character_receipt')
  .digest()
  .subarray(0, 8)

export type ParsedCharacterMintReceipt = {
  receiptId: Buffer
  player: PublicKey
  lamportsPaid: bigint
  earthCredited: bigint
  createdAt: bigint
  finalized: boolean
  bump: number
}

export type VerifiedCharacterMintReceipt = ParsedCharacterMintReceipt & {
  receiptAddress: PublicKey
  programId: PublicKey
}

export function getEarthVaultProgramId(): PublicKey {
  return new PublicKey(process.env.EARTH_VAULT_PROGRAM_ID || DEFAULT_EARTH_VAULT_PROGRAM_ID)
}

export function getEarthVaultConfigAddress(): PublicKey {
  const address = process.env.EARTH_VAULT_CONFIG_ADDRESS
  if (!address) throw new Error('EARTH_VAULT_CONFIG_ADDRESS is not configured')
  return new PublicKey(address)
}

export function parseReceiptId(value: unknown): Buffer {
  if (Array.isArray(value)) {
    const bytes = Buffer.from(value)
    if (bytes.length === 32) return bytes
  }

  if (typeof value === 'string') {
    const normalized = value.startsWith('0x') ? value.slice(2) : value
    if (/^[0-9a-fA-F]{64}$/.test(normalized)) {
      return Buffer.from(normalized, 'hex')
    }

    const base64 = Buffer.from(value, 'base64')
    if (base64.length === 32) return base64
  }

  throw new Error('Earth Vault receipt id must be 32 bytes as hex, base64, or byte array')
}

export function deriveCharacterMintReceiptAddress(
  player: PublicKey,
  receiptId: Buffer,
  programId = getEarthVaultProgramId()
): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [CHARACTER_MINT_RECEIPT_SEED, player.toBuffer(), receiptId],
    programId
  )
  return address
}

export function parseCharacterMintReceipt(data: Buffer): ParsedCharacterMintReceipt {
  if (data.length < RECEIPT_SIZE) {
    throw new Error('Earth Vault receipt account is too small')
  }

  const receiptId = data.subarray(DISCRIMINATOR_SIZE, DISCRIMINATOR_SIZE + 32)
  const player = new PublicKey(data.subarray(40, 72))
  const lamportsPaid = data.readBigUInt64LE(72)
  const earthCredited = data.readBigUInt64LE(80)
  const createdAt = data.readBigInt64LE(88)
  const finalized = data[96] === 1
  const bump = data[97]

  return { receiptId, player, lamportsPaid, earthCredited, createdAt, finalized, bump }
}

export async function verifyCharacterMintReceipt(args: {
  connection: Connection
  walletAddress: string
  receiptId: Buffer
  receiptAddress?: string
  expectedLamports?: bigint
}): Promise<VerifiedCharacterMintReceipt> {
  const programId = getEarthVaultProgramId()
  const player = new PublicKey(args.walletAddress)
  const derivedAddress = deriveCharacterMintReceiptAddress(player, args.receiptId, programId)
  const receiptAddress = args.receiptAddress ? new PublicKey(args.receiptAddress) : derivedAddress

  if (!receiptAddress.equals(derivedAddress)) {
    throw new Error('Earth Vault receipt address does not match wallet and receipt id')
  }

  const account = await args.connection.getAccountInfo(receiptAddress, 'confirmed')
  if (!account) throw new Error('Earth Vault character mint receipt not found')
  if (!account.owner.equals(programId)) throw new Error('Earth Vault receipt account owner mismatch')

  const parsed = parseCharacterMintReceipt(Buffer.from(account.data))
  if (!parsed.player.equals(player)) throw new Error('Earth Vault receipt payer mismatch')
  if (!parsed.receiptId.equals(args.receiptId)) throw new Error('Earth Vault receipt id mismatch')
  if (parsed.finalized) throw new Error('Earth Vault receipt has already been finalized')
  if (args.expectedLamports && parsed.lamportsPaid < args.expectedLamports) {
    throw new Error('Earth Vault receipt payment amount is insufficient')
  }

  return { ...parsed, receiptAddress, programId }
}

export async function finalizeCharacterMintReceipt(args: {
  connection: Connection
  receiptAddress: PublicKey
  serverKeypair: Keypair
}): Promise<string> {
  const programId = getEarthVaultProgramId()
  const configAddress = getEarthVaultConfigAddress()
  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: args.serverKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: configAddress, isSigner: false, isWritable: false },
      { pubkey: args.receiptAddress, isSigner: false, isWritable: true },
    ],
    data: FINALIZE_RECEIPT_DISCRIMINATOR,
  })

  return sendAndConfirmTransaction(
    args.connection,
    new Transaction().add(instruction),
    [args.serverKeypair],
    { commitment: 'confirmed' }
  )
}
