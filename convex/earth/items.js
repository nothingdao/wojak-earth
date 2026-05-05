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
        category: v.union(v.literal("CLOTHING"), v.literal("HAT"), v.literal("ACCESSORY"), v.literal("TOOL"), v.literal("CONSUMABLE"), v.literal("MATERIAL")),
    },
    handler: async (ctx, { category }) => {
        return ctx.db
            .query("earth_items")
            .withIndex("by_category", (q) => q.eq("category", category))
            .collect();
    },
});
export const upsert = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        category: v.union(v.literal("CLOTHING"), v.literal("HAT"), v.literal("ACCESSORY"), v.literal("TOOL"), v.literal("CONSUMABLE"), v.literal("MATERIAL")),
        rarity: v.union(v.literal("COMMON"), v.literal("UNCOMMON"), v.literal("RARE"), v.literal("EPIC"), v.literal("LEGENDARY")),
        layerFile: v.optional(v.string()),
        layerType: v.optional(v.string()),
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
