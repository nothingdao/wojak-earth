import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
export const getByCharacter = query({
    args: { characterId: v.string() },
    handler: async (ctx, { characterId }) => {
        return ctx.db
            .query("earth_storyFlags")
            .withIndex("by_character", (q) => q.eq("characterId", characterId))
            .filter((q) => q.neq(q.field("isActive"), false))
            .collect();
    },
});
export const has = query({
    args: { characterId: v.string(), flagName: v.string() },
    handler: async (ctx, { characterId, flagName }) => {
        const flag = await ctx.db
            .query("earth_storyFlags")
            .withIndex("by_character_flag", (q) => q.eq("characterId", characterId).eq("flagName", flagName))
            .filter((q) => q.neq(q.field("isActive"), false))
            .unique();
        return flag !== null;
    },
});
export const set = mutation({
    args: {
        characterId: v.string(),
        flagName: v.string(),
        flagValue: v.optional(v.any()),
        storyId: v.optional(v.string()),
        chapterAcquired: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("earth_storyFlags")
            .withIndex("by_character_flag", (q) => q.eq("characterId", args.characterId).eq("flagName", args.flagName))
            .unique();
        const now = Date.now();
        if (existing) {
            await ctx.db.patch(existing._id, {
                flagValue: args.flagValue,
                isActive: true,
                updatedAt: now,
            });
            return existing._id;
        }
        return ctx.db.insert("earth_storyFlags", {
            characterId: args.characterId,
            flagName: args.flagName,
            flagValue: args.flagValue,
            storyId: args.storyId,
            chapterAcquired: args.chapterAcquired,
            metadata: args.metadata,
            isActive: true,
            acquiredAt: now,
            createdAt: now,
            updatedAt: now,
        });
    },
});
