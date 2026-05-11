import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { creditLedger, debitLedger, displayEarthToRaw } from "./earthLedgerModel";

export const getFullByWallet = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    const character = await ctx.db
      .query("earth_characters")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .unique();

    if (!character) return null;

    let location = null;
    try {
      location = await ctx.db.get(character.currentLocationId as Id<"earth_locations">);
    } catch (_) {
      // currentLocationId may not be a valid Convex ID during data migration
    }

    const inventory = await ctx.db
      .query("earth_inventory")
      .withIndex("by_character", (q) => q.eq("characterId", character._id.toString()))
      .collect();

    const inventoryWithItems = await Promise.all(
      inventory.map(async (inv) => {
        let item = null;
        try {
          item = await ctx.db.get(inv.itemId as Id<"earth_items">);
        } catch (_) {}
        return { ...inv, item };
      })
    );

    const storyFlags = await ctx.db
      .query("earth_storyFlags")
      .withIndex("by_character", (q) => q.eq("characterId", character._id.toString()))
      .collect();

    const completedChapters = storyFlags
      .filter((f) => f.flagName.startsWith("chapter_completed_"))
      .map((f) => f.flagName.replace("chapter_completed_", ""));

    return { character, location, inventory: inventoryWithItems, completedChapters };
  },
});

export const getByWallet = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    return ctx.db
      .query("earth_characters")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .unique();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("earth_characters")
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .collect();
  },
});

export const getAtLocation = query({
  args: { locationId: v.string() },
  handler: async (ctx, { locationId }) => {
    return ctx.db
      .query("earth_characters")
      .withIndex("by_location", (q) => q.eq("currentLocationId", locationId))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .collect();
  },
});

export const getVisualData = query({
  args: { characterId: v.id("earth_characters") },
  handler: async (ctx, { characterId }) => {
    const character = await ctx.db.get(characterId);
    if (!character) return null;

    const inventory = await ctx.db
      .query("earth_inventory")
      .withIndex("by_character_equipped", (q) =>
        q.eq("characterId", character._id).eq("isEquipped", true)
      )
      .collect();

    const itemIds = inventory.map((inv) => inv.itemId);
    const items = await Promise.all(
      itemIds.map((id) =>
        ctx.db
          .query("earth_items")
          .filter((q) => q.eq(q.field("_id"), id))
          .unique()
      )
    );

    return {
      character,
      equippedItems: inventory.map((inv, i) => ({
        ...inv,
        item: items[i],
      })),
    };
  },
});

export const create = mutation({
  args: {
    walletAddress: v.string(),
    name: v.string(),
    characterType: v.union(
      v.literal("HUMAN"),
      v.literal("CREATURE"),
      v.literal("NPC")
    ),
    gender: v.union(v.literal("MALE"), v.literal("FEMALE")),
    currentLocationId: v.string(),
    paymentSignature: v.optional(v.string()),
    baseLayerFile: v.optional(v.string()),
    baseGender: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("earth_characters", {
      ...args,
      status: "ACTIVE",
      level: 1,
      health: 100,
      energy: 100,
      earth: 0,
      experience: 0,
      currentVersion: 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateAppearance = mutation({
  args: {
    walletAddress: v.string(),
    currentImageUrl: v.optional(v.string()),
    currentVersion: v.optional(v.number()),
    baseLayerFile: v.optional(v.string()),
  },
  handler: async (ctx, { walletAddress, ...updates }) => {
    const character = await ctx.db
      .query("earth_characters")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .unique();
    if (!character) throw new Error("Character not found");
    await ctx.db.patch(character._id, { ...updates, updatedAt: Date.now() });
    return character._id;
  },
});

export const setNftAddress = mutation({
  args: {
    characterId: v.id("earth_characters"),
    walletAddress: v.string(),
    nftAddress: v.string(),
    tokenId: v.optional(v.string()),
  },
  handler: async (ctx, { characterId, walletAddress, nftAddress, tokenId }) => {
    const character = await ctx.db.get(characterId);
    if (!character || character.status !== "ACTIVE") {
      throw new Error("Character not found");
    }
    if (character.walletAddress !== walletAddress) {
      throw new Error("Wallet mismatch");
    }
    if (character.nftAddress && character.nftAddress !== nftAddress) {
      throw new Error("Character already has a different NFT address");
    }

    await ctx.db.patch(characterId, {
      nftAddress,
      tokenId: tokenId ?? character.tokenId ?? nftAddress,
      updatedAt: Date.now(),
    });

    return characterId;
  },
});

export const adminUpdateStats = mutation({
  args: {
    characterId: v.id("earth_characters"),
    updates: v.object({
      level: v.optional(v.number()),
      earth: v.optional(v.number()),
      health: v.optional(v.number()),
      energy: v.optional(v.number()),
      experience: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { characterId, updates }) => {
    const character = await ctx.db.get(characterId);
    if (!character || character.status !== "ACTIVE") {
      throw new Error("Character not found");
    }

    const patch: Partial<typeof character> & { updatedAt: number } = { updatedAt: Date.now() };
    if (updates.level !== undefined) patch.level = Math.max(1, Math.floor(updates.level));
    if (updates.earth !== undefined) patch.earth = Math.max(0, updates.earth);
    if (updates.health !== undefined) patch.health = Math.max(0, Math.min(100, updates.health));
    if (updates.energy !== undefined) patch.energy = Math.max(0, Math.min(100, updates.energy));
    if (updates.experience !== undefined) patch.experience = Math.max(0, updates.experience);

    await ctx.db.patch(characterId, patch);
    return { success: true };
  },
});

export const adminSetStatus = mutation({
  args: {
    characterId: v.id("earth_characters"),
    status: v.union(v.literal("ACTIVE"), v.literal("BANNED"), v.literal("DELETED")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { characterId, status, reason }) => {
    const character = await ctx.db.get(characterId);
    if (!character) throw new Error("Character not found");
    await ctx.db.patch(characterId, {
      status,
      updatedAt: Date.now(),
    });
    if (reason) {
      await ctx.db.insert("earth_transactions", {
        characterId: characterId.toString(),
        type: "BRIDGE",
        description: `Admin status set to ${status}: ${reason}`,
        createdAt: Date.now(),
      });
    }
    return { success: true };
  },
});

export const adminResetWorldDay = mutation({
  args: {},
  handler: async (ctx) => {
    const characters = await ctx.db
      .query("earth_characters")
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .collect();
    const now = Date.now();
    for (const character of characters) {
      await ctx.db.patch(character._id, { energy: 100, updatedAt: now });
    }
    return { success: true, updated: characters.length };
  },
});

export const applyConsequenceEffects = mutation({
  args: {
    characterId: v.string(),
    health: v.optional(v.number()),
    energy: v.optional(v.number()),
    experience: v.optional(v.number()),
    earth: v.optional(v.number()),
  },
  handler: async (ctx, { characterId, health, energy, experience, earth }) => {
    const characters = await ctx.db.query("earth_characters").collect();
    const character = characters.find((c) => c._id.toString() === characterId);
    if (!character) throw new Error("Character not found");

    const updates: Record<string, number> = { updatedAt: Date.now() };
    if (health !== undefined && health !== 0) {
      updates.health = Math.max(0, Math.min(100, character.health + health));
    }
    if (energy !== undefined && energy !== 0) {
      updates.energy = Math.max(0, Math.min(100, character.energy + energy));
    }
    if (experience !== undefined && experience !== 0) {
      updates.experience = Math.max(0, (character.experience ?? 0) + experience);
    }
    if (earth !== undefined && earth !== 0) {
      if (earth > 0) {
        await creditLedger(ctx, {
          character,
          amountRaw: displayEarthToRaw(earth),
          source: "story_reward",
          receiptId: `story:${characterId}:${Date.now()}`,
        });
      } else {
        await debitLedger(ctx, {
          character,
          amountRaw: displayEarthToRaw(Math.abs(earth)),
          source: "story_spend",
        });
      }
    }
    await ctx.db.patch(character._id, updates);
  },
});

export const getByPaymentSignature = query({
  args: { paymentSignature: v.string() },
  handler: async (ctx, { paymentSignature }) => {
    return ctx.db
      .query("earth_characters")
      .filter((q) => q.eq(q.field("paymentSignature"), paymentSignature))
      .unique();
  },
});

export const getLeaderboards = query({
  args: {},
  handler: async (ctx) => {
    const characters = await ctx.db
      .query("earth_characters")
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .collect();

    const sorted = [...characters];
    const byLevel = [...sorted]
      .sort((a, b) => b.level - a.level || (b.experience ?? 0) - (a.experience ?? 0))
      .slice(0, 10);
    const byWealth = [...sorted]
      .sort((a, b) => b.earth - a.earth)
      .slice(0, 10);

    const format = (c: (typeof characters)[0]) => ({
      id: c._id,
      name: c.name,
      level: c.level,
      character_type: c.characterType,
      earth: c.earth,
      experience: c.experience ?? 0,
      currentLocationId: c.currentLocationId,
    });

    return {
      level: byLevel.map(format),
      wealth: byWealth.map(format),
      mining: byLevel.map(format), // mining stat not tracked separately yet
      last_updated: new Date().toISOString(),
    };
  },
});

export const nuke = mutation({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    const character = await ctx.db
      .query("earth_characters")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .unique();
    if (!character) throw new Error("Character not found");
    await ctx.db.patch(character._id, {
      status: "DELETED",
      updatedAt: Date.now(),
    });
  },
});

export const travel = mutation({
  args: {
    walletAddress: v.string(),
    destinationId: v.string(),
  },
  handler: async (ctx, { walletAddress, destinationId }) => {
    const character = await ctx.db
      .query("earth_characters")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .unique();
    if (!character) throw new Error("Character not found");

    if (character.currentLocationId === destinationId) {
      throw new Error("Already at destination");
    }

    const destination = await ctx.db.get(destinationId as Id<"earth_locations">);
    if (!destination) throw new Error("Destination not found");

    if (destination.isPrivate) throw new Error("Private location — access restricted");
    if (destination.minLevel && character.level < destination.minLevel) {
      throw new Error(`Level ${destination.minLevel} required`);
    }
    const entryCost = destination.entryCost ?? 0;

    const currentLocation = await ctx.db.get(character.currentLocationId as Id<"earth_locations">);

    const healthCost = currentLocation
      ? Math.max(1, destination.difficulty - currentLocation.difficulty)
      : 1;

    const now = Date.now();
    if (entryCost > 0) {
      await debitLedger(ctx, {
        character,
        amountRaw: displayEarthToRaw(entryCost),
        source: "travel_entry_cost",
        metadata: { destinationId },
      });
    }

    await ctx.db.patch(character._id, {
      currentLocationId: destinationId,
      health: Math.max(0, character.health - healthCost),
      updatedAt: now,
    });

    if (currentLocation) {
      await ctx.db.patch(currentLocation._id, {
        playerCount: Math.max(0, (currentLocation.playerCount || 1) - 1),
      });
    }
    await ctx.db.patch(destination._id, {
      playerCount: (destination.playerCount || 0) + 1,
    });

    await ctx.db.insert("earth_transactions", {
      characterId: character._id.toString(),
      type: "TRAVEL",
      description: `Traveled to ${destination.name}`,
      earthTxn: entryCost > 0 ? entryCost.toString() : undefined,
      createdAt: now,
    });

    return { success: true, destination: destination.name };
  },
});
