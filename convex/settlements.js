"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, } from "@solana/spl-token";
import { Connection, Ed25519Program, Keypair, PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY, SystemProgram, Transaction, TransactionInstruction, } from "@solana/web3.js";
import nacl from "tweetnacl";
import { buildSettlementAuthorizationMessage, sessionIdToBytes, } from "../packages/shared/vault/messages";
const PROGRAM_ID = new PublicKey("4bRZK8XfziVhLCgvtRdFJyTgN6tXGSPJT8xfbtt1AxBB");
const ASTRDS_MINT = new PublicKey("5sqKSHDKZr4KbNzj972PSfmEhtR9eLeBvv1nBRbeQAnB");
const SETTLE_GAME_DISCRIMINATOR = Buffer.from([
    96, 54, 24, 189, 239, 198, 86, 29,
]);
const enc = new TextEncoder();
const VAULT_CONFIG_SEED = enc.encode("vault-config");
const ECONOMY_STATS_SEED = enc.encode("economy-stats");
const PLAYER_EMISSION_SEED = enc.encode("player-emission");
const GAME_SETTLEMENT_SEED = enc.encode("game-settlement");
const TOKEN_DECIMALS = 9;
const MAX_ASTRDS_PER_GAME_RAW = 50n * 10n ** BigInt(TOKEN_DECIMALS);
function getConnection() {
    const rpcEndpoint = process.env.SOLANA_RPC_ENDPOINT;
    if (!rpcEndpoint)
        throw new Error("SOLANA_RPC_ENDPOINT not set");
    return new Connection(rpcEndpoint, "confirmed");
}
function loadKeypair(name) {
    const raw = process.env[name];
    if (!raw)
        throw new Error(`${name} not set`);
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw)));
}
function findVaultConfigPda() {
    return PublicKey.findProgramAddressSync([VAULT_CONFIG_SEED], PROGRAM_ID)[0];
}
function findEconomyStatsPda() {
    return PublicKey.findProgramAddressSync([ECONOMY_STATS_SEED], PROGRAM_ID)[0];
}
function findPlayerEmissionPda(player) {
    return PublicKey.findProgramAddressSync([PLAYER_EMISSION_SEED, player.toBuffer()], PROGRAM_ID)[0];
}
function findGameSettlementPda(sessionId) {
    return PublicKey.findProgramAddressSync([GAME_SETTLEMENT_SEED, Buffer.from(sessionId)], PROGRAM_ID)[0];
}
export const submitAstrdsSettlement = internalAction({
    args: {
        sessionId: v.string(),
        walletAddress: v.string(),
        amountRaw: v.string(),
        allocatedRaw: v.string(),
        score: v.number(),
        level: v.number(),
        pillsCollected: v.number(),
    },
    handler: async (ctx, args) => {
        if (!process.env.SETTLEMENT_PAYER_PRIVATE_KEY) {
            console.warn("SETTLEMENT_PAYER_PRIVATE_KEY not set — skipping server-side settlement submit");
            return { submitted: false };
        }
        const connection = getConnection();
        const payer = loadKeypair("SETTLEMENT_PAYER_PRIVATE_KEY");
        const authority = loadKeypair("PROGRAM_AUTHORITY_PRIVATE_KEY");
        const player = new PublicKey(args.walletAddress);
        const sessionIdBytes = sessionIdToBytes(args.sessionId);
        const allocatedRaw = BigInt(args.allocatedRaw);
        const earnedRaw = BigInt(args.amountRaw);
        if (allocatedRaw <= 0n || allocatedRaw > MAX_ASTRDS_PER_GAME_RAW) {
            throw new Error("Invalid allocatedRaw");
        }
        if (earnedRaw < 0n || earnedRaw > allocatedRaw) {
            throw new Error("Invalid amountRaw");
        }
        const gameSettlement = findGameSettlementPda(sessionIdBytes);
        const existing = await connection.getAccountInfo(gameSettlement, "confirmed");
        if (existing)
            return { submitted: false };
        const vaultConfig = findVaultConfigPda();
        const economyStats = findEconomyStatsPda();
        const playerEmission = findPlayerEmissionPda(player);
        const emissionVault = getAssociatedTokenAddressSync(ASTRDS_MINT, vaultConfig, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
        const expiry = Math.floor(Date.now() / 1000) + 10 * 60;
        const message = buildSettlementAuthorizationMessage({
            player,
            sessionId: sessionIdBytes,
            allocatedRaw,
            earnedRaw,
            score: args.score,
            level: args.level,
            pillsCollected: args.pillsCollected,
            expiry,
        });
        const signature = nacl.sign.detached(message, authority.secretKey);
        const settleArgs = Buffer.alloc(70);
        sessionIdBytes.forEach((b, i) => settleArgs.writeUInt8(b, i));
        settleArgs.writeBigUInt64LE(allocatedRaw, 32);
        settleArgs.writeBigUInt64LE(earnedRaw, 40);
        settleArgs.writeBigUInt64LE(BigInt(args.score), 48);
        settleArgs.writeUInt32LE(args.level, 56);
        settleArgs.writeUInt16LE(args.pillsCollected, 60);
        settleArgs.writeBigInt64LE(BigInt(expiry), 62);
        const settleIx = new TransactionInstruction({
            programId: PROGRAM_ID,
            data: Buffer.concat([SETTLE_GAME_DISCRIMINATOR, settleArgs]),
            keys: [
                { pubkey: payer.publicKey, isSigner: true, isWritable: true },
                { pubkey: player, isSigner: false, isWritable: false },
                { pubkey: vaultConfig, isSigner: false, isWritable: false },
                { pubkey: ASTRDS_MINT, isSigner: false, isWritable: true },
                { pubkey: emissionVault, isSigner: false, isWritable: true },
                { pubkey: economyStats, isSigner: false, isWritable: true },
                { pubkey: playerEmission, isSigner: false, isWritable: true },
                { pubkey: gameSettlement, isSigner: false, isWritable: true },
                { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
                { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
        });
        const tx = new Transaction().add(Ed25519Program.createInstructionWithPublicKey({
            publicKey: authority.publicKey.toBytes(),
            message,
            signature,
        }), settleIx);
        tx.feePayer = payer.publicKey;
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.sign(payer);
        const txSignature = await connection.sendRawTransaction(tx.serialize(), {
            skipPreflight: false,
            preflightCommitment: "confirmed",
        });
        await connection.confirmTransaction({ signature: txSignature, blockhash, lastValidBlockHeight }, "confirmed");
        await ctx.runMutation(internal.gameSessions.setSettlementTxSignature, {
            sessionId: args.sessionId,
            txSignature,
        });
        return { submitted: true, signature: txSignature };
    },
});
