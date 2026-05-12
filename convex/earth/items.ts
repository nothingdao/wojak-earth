import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("earth_items").collect();
  },
});

export const getById = query({
  args: { itemId: v.id("earth_items") },
  handler: async (ctx, { itemId }) => {
    return ctx.db.get(itemId);
  },
});

export const getByCategory = query({
  args: {
    category: v.union(
      v.literal("CLOTHING"),
      v.literal("HAT"),
      v.literal("ACCESSORY"),
      v.literal("TOOL"),
      v.literal("CONSUMABLE"),
      v.literal("MATERIAL")
    ),
  },
  handler: async (ctx, { category }) => {
    return ctx.db
      .query("earth_items")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();
  },
});

const layerTypeValidator = v.union(
  v.literal("BACKGROUND"),
  v.literal("BASE"),
  v.literal("CLOTHING"),
  v.literal("HAT"),
  v.literal("FACE_COVERING"),
  v.literal("ACCESSORY"),
  v.literal("OUTERWEAR"),
  v.literal("FACE_ACCESSORY"),
  v.literal("HAIR")
);

const itemPatchValidator = v.object({
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  category: v.optional(v.union(
    v.literal("CLOTHING"),
    v.literal("HAT"),
    v.literal("ACCESSORY"),
    v.literal("TOOL"),
    v.literal("CONSUMABLE"),
    v.literal("MATERIAL")
  )),
  rarity: v.optional(v.union(
    v.literal("COMMON"),
    v.literal("UNCOMMON"),
    v.literal("RARE"),
    v.literal("EPIC"),
    v.literal("LEGENDARY")
  )),
  layerFile: v.optional(v.string()),
  layerType: v.optional(layerTypeValidator),
  layerGender: v.optional(v.string()),
  layerOrder: v.optional(v.number()),
  baseLayerFile: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  isVisual: v.optional(v.boolean()),
  hasGenderVariants: v.optional(v.boolean()),
  healthEffect: v.optional(v.number()),
  energyEffect: v.optional(v.number()),
  durability: v.optional(v.number()),
  compatibilityRules: v.optional(v.any()),
});

export const upsert = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("CLOTHING"),
      v.literal("HAT"),
      v.literal("ACCESSORY"),
      v.literal("TOOL"),
      v.literal("CONSUMABLE"),
      v.literal("MATERIAL")
    ),
    rarity: v.union(
      v.literal("COMMON"),
      v.literal("UNCOMMON"),
      v.literal("RARE"),
      v.literal("EPIC"),
      v.literal("LEGENDARY")
    ),
    layerFile: v.optional(v.string()),
    layerType: v.optional(layerTypeValidator),
    imageUrl: v.optional(v.string()),
    isVisual: v.optional(v.boolean()),
    healthEffect: v.optional(v.number()),
    energyEffect: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("earth_items", { ...args, createdAt: now, updatedAt: now });
  },
});

export const adminUpdate = mutation({
  args: {
    itemId: v.id("earth_items"),
    updates: itemPatchValidator,
  },
  handler: async (ctx, { itemId, updates }) => {
    const item = await ctx.db.get(itemId);
    if (!item) throw new Error("Item not found");
    await ctx.db.patch(itemId, { ...updates, updatedAt: Date.now() });
    return { success: true };
  },
});
