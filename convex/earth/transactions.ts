import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { debitLedger, displayEarthToRaw } from "./earthLedgerModel";

export const mineAtLocation = mutation({
  args: {
    walletAddress: v.string(),
    locationId: v.string(),
  },
  handler: async (ctx, { walletAddress, locationId }) => {
    const character = await ctx.db
      .query("earth_characters")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .unique();
    if (!character) throw new Error("Character not found");
    if (character.currentLocationId !== locationId) throw new Error("Not at this location");
    if (character.energy < 10) throw new Error("Insufficient energy");

    const resources = await ctx.db
      .query("earth_locationResources")
      .withIndex("by_location", (q) => q.eq("locationId", locationId))
      .collect();
    if (resources.length === 0) throw new Error("No resources at this location");

    const resource = resources[Math.floor(Math.random() * resources.length)];
    const now = Date.now();
    const energyCost = Math.ceil(resource.difficulty * 5);

    await ctx.db.patch(character._id, {
      energy: Math.max(0, character.energy - energyCost),
      updatedAt: now,
    });

    const existing = await ctx.db
      .query("earth_inventory")
      .withIndex("by_character_item", (q) =>
        q.eq("characterId", character._id.toString()).eq("itemId", resource.itemId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { quantity: existing.quantity + 1, updatedAt: now });
    } else {
      await ctx.db.insert("earth_inventory", {
        characterId: character._id.toString(),
        itemId: resource.itemId,
        quantity: 1,
        isEquipped: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("earth_transactions", {
      characterId: character._id.toString(),
      type: "MINE",
      description: "Mined resource",
      itemId: resource.itemId,
      quantity: 1,
      energyBurn: energyCost,
      createdAt: now,
    });

    return { success: true, energyCost };
  },
});

export const getGlobalActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    const txns = await ctx.db
      .query("earth_transactions")
      .order("desc")
      .take(limit);

    return Promise.all(
      txns.map(async (txn) => {
        const character = await ctx.db
          .query("earth_characters")
          .filter((q) => q.eq(q.field("_id"), txn.characterId))
          .unique();
        return { ...txn, character };
      })
    );
  },
});

export const getByCharacter = query({
  args: { characterId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { characterId, limit = 50 }) => {
    return ctx.db
      .query("earth_transactions")
      .withIndex("by_character", (q) => q.eq("characterId", characterId))
      .order("desc")
      .take(limit);
  },
});

export const mine = mutation({
  args: {
    walletAddress: v.string(),
    locationId: v.string(),
    resourceId: v.id("earth_locationResources"),
  },
  handler: async (ctx, { walletAddress, locationId, resourceId }) => {
    const character = await ctx.db
      .query("earth_characters")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .unique();
    if (!character) throw new Error("Character not found");
    if (character.currentLocationId !== locationId)
      throw new Error("Not at this location");
    if (character.energy < 10) throw new Error("Insufficient energy");

    const resource = await ctx.db.get(resourceId);
    if (!resource) throw new Error("Resource not found");

    const now = Date.now();
    const energyCost = Math.ceil(resource.difficulty * 5);

    await ctx.db.patch(character._id, {
      energy: Math.max(0, character.energy - energyCost),
      updatedAt: now,
    });

    const existing = await ctx.db
      .query("earth_inventory")
      .withIndex("by_character_item", (q) =>
        q.eq("characterId", character._id.toString()).eq("itemId", resource.itemId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { quantity: existing.quantity + 1, updatedAt: now });
    } else {
      await ctx.db.insert("earth_inventory", {
        characterId: character._id.toString(),
        itemId: resource.itemId,
        quantity: 1,
        isEquipped: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("earth_transactions", {
      characterId: character._id.toString(),
      type: "MINE",
      description: "Mined resource",
      itemId: resource.itemId,
      quantity: 1,
      energyBurn: energyCost,
      createdAt: now,
    });

    return { success: true, energyCost };
  },
});

export const travel = mutation({
  args: {
    walletAddress: v.string(),
    destinationLocationId: v.string(),
  },
  handler: async (ctx, { walletAddress, destinationLocationId }) => {
    const character = await ctx.db
      .query("earth_characters")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .unique();
    if (!character) throw new Error("Character not found");

    const destination = await ctx.db
      .query("earth_locations")
      .filter((q) => q.eq(q.field("_id"), destinationLocationId))
      .unique();
    if (!destination) throw new Error("Destination not found");
    if (destination.minLevel && character.level < destination.minLevel)
      throw new Error("Level too low for this location");

    const now = Date.now();
    const entryCost = destination.entryCost ?? 0;
    if (entryCost > 0) {
      await debitLedger(ctx, {
        character,
        amountRaw: displayEarthToRaw(entryCost),
        source: "travel_entry_cost",
        metadata: { destinationLocationId },
      });
    }

    await ctx.db.patch(character._id, {
      currentLocationId: destinationLocationId,
      updatedAt: now,
    });

    await ctx.db.insert("earth_transactions", {
      characterId: character._id.toString(),
      type: "TRAVEL",
      description: `Traveled to ${destination.name}`,
      earthTxn: entryCost > 0 ? entryCost.toString() : undefined,
      createdAt: now,
    });

    return { success: true };
  },
});
