import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAvatar = mutation({
  args: {
    walletAddress: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { walletAddress, storageId }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("players")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .first();
    const existingProfile = await ctx.db
      .query("walletProfiles")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .first();

    const oldStorageIds = new Set(
      [existing?.avatarStorageId, existingProfile?.avatarStorageId].filter(
        (id): id is typeof storageId => !!id && id !== storageId
      )
    );
    for (const oldStorageId of oldStorageIds) {
      await ctx.storage.delete(oldStorageId);
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        avatarStorageId: storageId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("players", {
        walletAddress,
        avatarStorageId: storageId,
        updatedAt: now,
      });
    }

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        avatarStorageId: storageId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("walletProfiles", {
        walletAddress,
        avatarStorageId: storageId,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const getAvatarUrl = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .first();
    const profile = await ctx.db
      .query("walletProfiles")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .first();
    const avatarStorageId = profile?.avatarStorageId ?? player?.avatarStorageId;
    if (!avatarStorageId) return null;
    return await ctx.storage.getUrl(avatarStorageId);
  },
});

// Batch query — used by chat and leaderboard to load all avatars at once
export const getAvatarUrls = query({
  args: { walletAddresses: v.array(v.string()) },
  handler: async (ctx, { walletAddresses }) => {
    const result: Record<string, string | null> = {};
    await Promise.all(
      walletAddresses.map(async (wallet) => {
        const player = await ctx.db
          .query("players")
          .withIndex("by_wallet", (q) => q.eq("walletAddress", wallet))
          .first();
        const profile = await ctx.db
          .query("walletProfiles")
          .withIndex("by_wallet", (q) => q.eq("walletAddress", wallet))
          .first();
        const avatarStorageId = profile?.avatarStorageId ?? player?.avatarStorageId;
        result[wallet] = avatarStorageId ? await ctx.storage.getUrl(avatarStorageId) : null;
      })
    );
    return result;
  },
});
