import { describe, expect, it } from 'vitest'
import { PublicKey } from '@solana/web3.js'
import {
  DEFAULT_EARTH_VAULT_PROGRAM_ID,
  deriveCharacterMintReceiptAddress,
  parseCharacterMintReceipt,
  parseReceiptId,
} from './earthVault.js'

describe('earthVault helpers', () => {
  it('parses receipt ids from hex, base64, and byte arrays', () => {
    const bytes = Buffer.alloc(32, 7)
    expect(parseReceiptId(bytes.toString('hex')).equals(bytes)).toBe(true)
    expect(parseReceiptId(bytes.toString('base64')).equals(bytes)).toBe(true)
    expect(parseReceiptId(Array.from(bytes)).equals(bytes)).toBe(true)
  })

  it('derives deterministic character receipt PDA', () => {
    const player = new PublicKey('jrXCZwP8bxDnGs7ChD4F77We1K4J89R53SAVk5HsSoE')
    const receiptId = Buffer.alloc(32, 1)
    const first = deriveCharacterMintReceiptAddress(player, receiptId, new PublicKey(DEFAULT_EARTH_VAULT_PROGRAM_ID))
    const second = deriveCharacterMintReceiptAddress(player, receiptId, new PublicKey(DEFAULT_EARTH_VAULT_PROGRAM_ID))
    expect(first.toBase58()).toEqual(second.toBase58())
  })

  it('parses CharacterMintReceipt account layout', () => {
    const receiptId = Buffer.alloc(32, 3)
    const player = new PublicKey('jrXCZwP8bxDnGs7ChD4F77We1K4J89R53SAVk5HsSoE')
    const data = Buffer.alloc(98)
    receiptId.copy(data, 8)
    player.toBuffer().copy(data, 40)
    data.writeBigUInt64LE(50_000_000n, 72)
    data.writeBigUInt64LE(100_000_000_000n, 80)
    data.writeBigInt64LE(1234n, 88)
    data[96] = 1
    data[97] = 255

    const parsed = parseCharacterMintReceipt(data)
    expect(parsed.receiptId.equals(receiptId)).toBe(true)
    expect(parsed.player.toBase58()).toEqual(player.toBase58())
    expect(parsed.lamportsPaid).toEqual(50_000_000n)
    expect(parsed.earthCredited).toEqual(100_000_000_000n)
    expect(parsed.createdAt).toEqual(1234n)
    expect(parsed.finalized).toBe(true)
    expect(parsed.bump).toBe(255)
  })
})
