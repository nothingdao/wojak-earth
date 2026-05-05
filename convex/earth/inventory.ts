import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const getByCharacter = query({
  args: { characterId: v.string() },
  handler: async (ctx, { characterId }) => {
    const inventory = await ctx.db
      .query("earth_inventory")
      .withIndex("by_character", (q) => q.eq("characterId", characterId))
      .collect();

    return Promise.all(
      inventory.map(async (inv) => {
        const item = await ctx.db
          .query("earth_items")
          .filter((q) => q.eq(q.field("_id"), inv.itemId))
          .unique();
        return { ...inv, item };
      })
    );
  },
});

export const getEquipped = query({
  args: { characterId: v.string() },
  handler: async (ctx, { characterId }) => {
    const equipped = await ctx.db
      .query("earth_inventory")
      .withIndex("by_character_equipped", (q) =>
        q.eq("characterId", characterId).eq("isEquipped", true)
      )
      .collect();

    const slots = await ctx.db.query("earth_equipmentSlots").collect();

    return Promise.all(
      equipped.map(async (inv) => {
        const item = await ctx.db
          .query("earth_items")
          .filter((q) => q.eq(q.field("_id"), inv.itemId))
          .unique();
        const slot = slots.find((s) => s._id.toString() === inv.equippedSlot);
        return { ...inv, item, slot };
      })
    );
  },
});

export const add = mutation({
  args: {
    characterId: v.string(),
    itemId: v.string(),
    quantity: v.optional(v.number()),
    isEquipped: v.optional(v.boolean()),
    slotId: v.optional(v.string()),
  },
  handler: async (ctx, { characterId, itemId, quantity = 1, isEquipped = false, slotId }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("earth_inventory")
      .withIndex("by_character", (q) => q.eq("characterId", characterId))
      .filter((q) => q.eq(q.field("itemId"), itemId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { quantity: existing.quantity + quantity, updatedAt: now });
    } else {
      await ctx.db.insert("earth_inventory", {
        characterId,
        itemId,
        quantity,
        isEquipped,
        equippedSlot: isEquipped ? (slotId ?? "default") : undefined,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const equip = mutation({
  args: {
    walletAddress: v.string(),
    inventoryId: v.id("earth_inventory"),
    slotId: v.optional(v.string()),
  },
  handler: async (ctx, { walletAddress, inventoryId, slotId }) => {
    const inv = await ctx.db.get(inventoryId);
    if (!inv) throw new Error("Inventory item not found");

    const character = await ctx.db
      .query("earth_characters")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .unique();
    if (!character) throw new Error("Character not found");
    if (inv.characterId !== character._id.toString())
      throw new Error("Not your item");

    await ctx.db.patch(inventoryId, {
      isEquipped: true,
      equippedSlot: slotId ?? "default",
      updatedAt: Date.now(),
    });
  },
});

export const unequip = mutation({
  args: {
    walletAddress: v.string(),
    inventoryId: v.id("earth_inventory"),
  },
  handler: async (ctx, { walletAddress, inventoryId }) => {
    const inv = await ctx.db.get(inventoryId);
    if (!inv) throw new Error("Inventory item not found");

    const character = await ctx.db
      .query("earth_characters")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .unique();
    if (!character) throw new Error("Character not found");
    if (inv.characterId !== character._id.toString())
      throw new Error("Not your item");

    await ctx.db.patch(inventoryId, {
      isEquipped: false,
      equippedSlot: undefined,
      updatedAt: Date.now(),
    });
  },
});
