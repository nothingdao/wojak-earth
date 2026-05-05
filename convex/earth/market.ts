import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const getByLocation = query({
  args: { locationId: v.string() },
  handler: async (ctx, { locationId }) => {
    const listings = await ctx.db
      .query("earth_marketListings")
      .withIndex("by_location", (q) => q.eq("locationId", locationId))
      .filter((q) => q.gt(q.field("quantity"), 0))
      .collect();

    return Promise.all(
      listings.map(async (listing) => {
        const item = await ctx.db
          .query("earth_items")
          .filter((q) => q.eq(q.field("_id"), listing.itemId))
          .unique();
        return { ...listing, item };
      })
    );
  },
});

export const getPreview = query({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db
      .query("earth_marketListings")
      .filter((q) => q.gt(q.field("quantity"), 0))
      .collect();
    return listings.length;
  },
});

export const buy = mutation({
  args: {
    walletAddress: v.string(),
    listingId: v.id("earth_marketListings"),
    quantity: v.number(),
  },
  handler: async (ctx, { walletAddress, listingId, quantity }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing) throw new Error("Listing not found");
    if (listing.quantity < quantity) throw new Error("Insufficient stock");

    const character = await ctx.db
      .query("earth_characters")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .unique();
    if (!character) throw new Error("Character not found");

    const totalCost = listing.price * quantity;
    if (character.earth < totalCost) throw new Error("Insufficient EARTH");

    await ctx.db.patch(character._id, {
      earth: character.earth - totalCost,
      updatedAt: Date.now(),
    });

    await ctx.db.patch(listingId, {
      quantity: listing.quantity - quantity,
      updatedAt: Date.now(),
    });

    const existing = await ctx.db
      .query("earth_inventory")
      .withIndex("by_character_item", (q) =>
        q.eq("characterId", character._id.toString()).eq("itemId", listing.itemId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: existing.quantity + quantity,
        updatedAt: Date.now(),
      });
    } else {
      const now = Date.now();
      await ctx.db.insert("earth_inventory", {
        characterId: character._id.toString(),
        itemId: listing.itemId,
        quantity,
        isEquipped: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    const now = Date.now();
    await ctx.db.insert("earth_transactions", {
      characterId: character._id.toString(),
      type: "BUY",
      description: `Bought ${quantity}x item`,
      itemId: listing.itemId,
      quantity,
      earthTxn: totalCost.toString(),
      createdAt: now,
    });

    return { success: true };
  },
});

export const sell = mutation({
  args: {
    walletAddress: v.string(),
    inventoryId: v.id("earth_inventory"),
    quantity: v.number(),
    price: v.number(),
    locationId: v.string(),
  },
  handler: async (ctx, { walletAddress, inventoryId, quantity, price, locationId }) => {
    const inv = await ctx.db.get(inventoryId);
    if (!inv) throw new Error("Inventory item not found");
    if (inv.quantity < quantity) throw new Error("Insufficient quantity");

    const character = await ctx.db
      .query("earth_characters")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .unique();
    if (!character) throw new Error("Character not found");
    if (inv.characterId !== character._id.toString())
      throw new Error("Not your item");

    const revenue = price * quantity;
    await ctx.db.patch(character._id, {
      earth: character.earth + revenue,
      updatedAt: Date.now(),
    });

    if (inv.quantity === quantity) {
      await ctx.db.delete(inventoryId);
    } else {
      await ctx.db.patch(inventoryId, {
        quantity: inv.quantity - quantity,
        updatedAt: Date.now(),
      });
    }

    const now = Date.now();
    await ctx.db.insert("earth_marketListings", {
      locationId,
      itemId: inv.itemId,
      price,
      quantity,
      isSystemItem: false,
      sellerId: character._id.toString(),
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("earth_transactions", {
      characterId: character._id.toString(),
      type: "SELL",
      description: `Sold ${quantity}x item`,
      itemId: inv.itemId,
      quantity,
      earthTxn: revenue.toString(),
      createdAt: now,
    });

    return { success: true };
  },
});
