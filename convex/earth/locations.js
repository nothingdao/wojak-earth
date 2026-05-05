import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
export const getAll = query({
    args: {},
    handler: async (ctx) => {
        return ctx.db.query("earth_locations").collect();
    },
});
export const getById = query({
    args: { locationId: v.id("earth_locations") },
    handler: async (ctx, { locationId }) => {
        return ctx.db.get(locationId);
    },
});
export const getResources = query({
    args: { locationId: v.string() },
    handler: async (ctx, { locationId }) => {
        const resources = await ctx.db
            .query("earth_locationResources")
            .withIndex("by_location", (q) => q.eq("locationId", locationId))
            .collect();
        return Promise.all(resources.map(async (r) => {
            const item = await ctx.db
                .query("earth_items")
                .filter((q) => q.eq(q.field("_id"), r.itemId))
                .unique();
            return { ...r, item };
        }));
    },
});
export const getPlayersAt = query({
    args: { locationId: v.string() },
    handler: async (ctx, { locationId }) => {
        return ctx.db
            .query("earth_characters")
            .withIndex("by_location", (q) => q.eq("currentLocationId", locationId))
            .filter((q) => q.eq(q.field("status"), "ACTIVE"))
            .collect();
    },
});
export const upsert = mutation({
    args: {
        name: v.string(),
        description: v.string(),
        locationType: v.string(),
        chatScope: v.union(v.literal("LOCAL"), v.literal("REGIONAL"), v.literal("GLOBAL")),
        difficulty: v.number(),
        hasChat: v.boolean(),
        hasMarket: v.boolean(),
        hasMining: v.boolean(),
        hasTravel: v.boolean(),
        hasExchange: v.boolean(),
        isPrivate: v.boolean(),
        parentLocationId: v.optional(v.string()),
        biome: v.optional(v.string()),
        svgPathId: v.optional(v.string()),
        mapX: v.optional(v.number()),
        mapY: v.optional(v.number()),
        minLevel: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        return ctx.db.insert("earth_locations", {
            ...args,
            playerCount: 0,
            createdAt: now,
            updatedAt: now,
        });
    },
});
