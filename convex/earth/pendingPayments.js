import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
export const getByWallet = query({
    args: { walletAddress: v.string() },
    handler: async (ctx, { walletAddress }) => {
        return ctx.db
            .query("earth_pendingPayments")
            .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
            .filter((q) => q.eq(q.field("status"), "pending"))
            .collect();
    },
});
export const create = mutation({
    args: {
        walletAddress: v.string(),
        treasuryWallet: v.string(),
        amount: v.number(),
        expiresAt: v.number(),
        characterData: v.optional(v.any()),
        memo: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return ctx.db.insert("earth_pendingPayments", {
            ...args,
            status: "pending",
            createdAt: Date.now(),
        });
    },
});
export const markVerified = mutation({
    args: {
        paymentId: v.id("earth_pendingPayments"),
        transactionSignature: v.string(),
        amountReceived: v.number(),
    },
    handler: async (ctx, { paymentId, transactionSignature, amountReceived }) => {
        await ctx.db.patch(paymentId, {
            status: "verified",
            transactionSignature,
            amountReceived,
            verifiedAt: Date.now(),
        });
    },
});
export const markMinted = mutation({
    args: {
        paymentId: v.id("earth_pendingPayments"),
        nftAddress: v.string(),
        characterId: v.string(),
    },
    handler: async (ctx, { paymentId, nftAddress, characterId }) => {
        await ctx.db.patch(paymentId, {
            status: "minted",
            nftAddress,
            nftMinted: true,
            characterId,
            mintedAt: Date.now(),
        });
    },
});
export const expireOld = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const expired = await ctx.db
            .query("earth_pendingPayments")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .filter((q) => q.lt(q.field("expiresAt"), now))
            .collect();
        for (const payment of expired) {
            await ctx.db.patch(payment._id, { status: "expired" });
        }
        return expired.length;
    },
});
