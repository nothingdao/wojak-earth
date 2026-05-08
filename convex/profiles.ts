import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const buildProfile = async (ctx: any, walletAddress: string) => {
  const profile = await ctx.db
    .query("walletProfiles")
    .withIndex("by_wallet", (q: any) => q.eq("walletAddress", walletAddress))
    .first();

  const legacyPlayer = await ctx.db
    .query("players")
    .withIndex("by_wallet", (q: any) => q.eq("walletAddress", walletAddress))
    .first();

  const avatarStorageId = profile?.avatarStorageId ?? legacyPlayer?.avatarStorageId;
  const avatarUrl = avatarStorageId ? await ctx.storage.getUrl(avatarStorageId) : null;

  const earthCharacter = await ctx.db
    .query("earth_characters")
    .withIndex("by_wallet", (q: any) => q.eq("walletAddress", walletAddress))
    .filter((q: any) => q.eq(q.field("status"), "ACTIVE"))
    .first();

  const sessions = await ctx.db
    .query("gameSessions")
    .withIndex("by_wallet", (q: any) => q.eq("walletAddress", walletAddress))
    .collect();
  const endedSessions = sessions.filter((session: { status: string }) => session.status === "ended");
  const bestScore = endedSessions.length > 0
    ? Math.max(...endedSessions.map((session: { score: number }) => session.score))
    : null;

  return {
    walletAddress,
    displayName: profile?.displayName ?? null,
    avatarUrl,
    earthCharacter: earthCharacter
      ? {
          id: earthCharacter._id,
          name: earthCharacter.name,
          imageUrl: earthCharacter.currentImageUrl ?? earthCharacter.birthImageUrl ?? null,
          nftAddress: earthCharacter.nftAddress ?? null,
          tokenId: earthCharacter.tokenId ?? null,
        }
      : null,
    astrds: {
      gamesPlayed: endedSessions.length,
      bestScore,
    },
    updatedAt: profile?.updatedAt ?? legacyPlayer?.updatedAt ?? null,
  };
};

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const upsert = mutation({
  args: {
    walletAddress: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, { walletAddress, displayName }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("walletProfiles")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(displayName !== undefined ? { displayName } : {}),
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("walletProfiles", {
      walletAddress,
      ...(displayName !== undefined ? { displayName } : {}),
      createdAt: now,
      updatedAt: now,
    });
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
      .query("walletProfiles")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .first();
    const legacyPlayer = await ctx.db
      .query("players")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .first();

    const oldStorageIds = new Set(
      [existing?.avatarStorageId, legacyPlayer?.avatarStorageId].filter(
        (id): id is typeof storageId => !!id && id !== storageId
      )
    );
    for (const oldStorageId of oldStorageIds) {
      await ctx.storage.delete(oldStorageId);
    }

    const profileId = existing
      ? existing._id
      : await ctx.db.insert("walletProfiles", {
          walletAddress,
          createdAt: now,
          updatedAt: now,
        });

    await ctx.db.patch(profileId, { avatarStorageId: storageId, updatedAt: now });

    if (legacyPlayer) {
      await ctx.db.patch(legacyPlayer._id, { avatarStorageId: storageId, updatedAt: now });
    } else {
      await ctx.db.insert("players", { walletAddress, avatarStorageId: storageId, updatedAt: now });
    }

    return profileId;
  },
});

export const getByWallet = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    return await buildProfile(ctx, walletAddress);
  },
});

export const getManyByWallets = query({
  args: { walletAddresses: v.array(v.string()) },
  handler: async (ctx, { walletAddresses }) => {
    const result: Record<string, Awaited<ReturnType<typeof buildProfile>>> = {};
    await Promise.all(
      [...new Set(walletAddresses)].map(async (walletAddress) => {
        result[walletAddress] = await buildProfile(ctx, walletAddress);
      })
    );
    return result;
  },
});

export const getAvatarUrl = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    const profile = await buildProfile(ctx, walletAddress);
    return profile.avatarUrl;
  },
});

export const getAvatarUrls = query({
  args: { walletAddresses: v.array(v.string()) },
  handler: async (ctx, { walletAddresses }) => {
    const profiles = await Promise.all(
      [...new Set(walletAddresses)].map(async (walletAddress) => [walletAddress, await buildProfile(ctx, walletAddress)] as const)
    );
    return Object.fromEntries(profiles.map(([walletAddress, profile]) => [walletAddress, profile.avatarUrl]));
  },
});
