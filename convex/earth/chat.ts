import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const getByLocation = query({
  args: { locationId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { locationId, limit = 50 }) => {
    const messages = await ctx.db
      .query("earth_chatMessages")
      .withIndex("by_location_time", (q) => q.eq("locationId", locationId))
      .order("desc")
      .take(limit);

    const withCharacters = await Promise.all(
      messages.map(async (msg) => {
        const character = await ctx.db
          .query("earth_characters")
          .filter((q) => q.eq(q.field("_id"), msg.characterId))
          .unique();
        return { ...msg, character };
      })
    );

    return withCharacters.reverse();
  },
});

export const send = mutation({
  args: {
    walletAddress: v.string(),
    locationId: v.string(),
    message: v.string(),
    messageType: v.optional(
      v.union(
        v.literal("CHAT"),
        v.literal("EMOTE"),
        v.literal("SYSTEM"),
        v.literal("WHISPER")
      )
    ),
  },
  handler: async (ctx, { walletAddress, locationId, message, messageType = "CHAT" }) => {
    const character = await ctx.db
      .query("earth_characters")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .unique();
    if (!character) throw new Error("Character not found");

    return ctx.db.insert("earth_chatMessages", {
      characterId: character._id.toString(),
      locationId,
      message,
      messageType,
      isSystem: false,
      createdAt: Date.now(),
    });
  },
});

export const sendSystem = mutation({
  args: {
    locationId: v.string(),
    message: v.string(),
    characterId: v.optional(v.string()),
  },
  handler: async (ctx, { locationId, message, characterId = "system" }) => {
    return ctx.db.insert("earth_chatMessages", {
      characterId,
      locationId,
      message,
      messageType: "SYSTEM",
      isSystem: true,
      createdAt: Date.now(),
    });
  },
});
