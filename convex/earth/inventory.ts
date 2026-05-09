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
    slotIndex: v.optional(v.number()),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, { characterId, itemId, quantity = 1, isEquipped = false, slotId, slotIndex = 1, isPrimary = false }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("earth_inventory")
      .withIndex("by_character", (q) => q.eq("characterId", characterId))
      .filter((q) => q.eq(q.field("itemId"), itemId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: existing.quantity + quantity,
        ...(isEquipped
          ? {
              isEquipped: true,
              equippedSlot: slotId ?? existing.equippedSlot ?? "default",
              slotIndex,
              isPrimary,
            }
          : {}),
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("earth_inventory", {
        characterId,
        itemId,
        quantity,
        isEquipped,
        equippedSlot: isEquipped ? (slotId ?? "default") : undefined,
        slotIndex: isEquipped ? slotIndex : undefined,
        isPrimary: isEquipped ? isPrimary : undefined,
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
    slotIndex: v.optional(v.number()),
    setPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, { walletAddress, inventoryId, slotId, slotIndex = 1, setPrimary = false }) => {
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

    const equippedSlot = slotId ?? inv.equippedSlot ?? "default";
    const targetSlotIndex = setPrimary ? (inv.slotIndex ?? slotIndex) : slotIndex;
    const now = Date.now();
    const inventory = await ctx.db
      .query("earth_inventory")
      .withIndex("by_character", (q) => q.eq("characterId", character._id.toString()))
      .collect();

    const currentPrimary = inventory.find(
      (item) => item.isEquipped && item.equippedSlot === equippedSlot && item.isPrimary
    );
    const shouldBePrimary = setPrimary || !currentPrimary || currentPrimary._id === inventoryId;

    await Promise.all(
      inventory
        .filter((item) => item._id !== inventoryId && item.isEquipped && item.equippedSlot === equippedSlot)
        .map(async (item) => {
          const patch: Partial<typeof item> & { updatedAt: number } = { updatedAt: now };
          if (!setPrimary && (item.slotIndex ?? 1) === targetSlotIndex) {
            patch.isEquipped = false;
            patch.equippedSlot = undefined;
            patch.slotIndex = undefined;
            patch.isPrimary = false;
          } else if (setPrimary && item.isPrimary) {
            patch.isPrimary = false;
          }
          await ctx.db.patch(item._id, patch);
        })
    );

    await ctx.db.patch(inventoryId, {
      isEquipped: true,
      equippedSlot,
      slotIndex: targetSlotIndex,
      isPrimary: shouldBePrimary,
      updatedAt: now,
    });

    const item = await ctx.db
      .query("earth_items")
      .filter((q) => q.eq(q.field("_id"), inv.itemId))
      .first();
    return {
      success: true,
      slotInfo: `${equippedSlot}_${targetSlotIndex}`,
      item: item ?? { rarity: "COMMON" },
    };
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
      slotIndex: undefined,
      isPrimary: false,
      updatedAt: Date.now(),
    });

    return { success: true, item: { rarity: "COMMON" } };
  },
});
