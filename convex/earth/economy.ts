import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const characters = await ctx.db
      .query("earth_characters")
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .collect();

    const transactions = await ctx.db
      .query("earth_transactions")
      .order("desc")
      .take(100);

    const totalEarth = characters.reduce((sum, c) => sum + c.earth, 0);
    const activePlayerCount = characters.length;

    const recentByType = transactions.reduce(
      (acc, txn) => {
        acc[txn.type] = (acc[txn.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalEarth,
      activePlayerCount,
      recentTransactionsByType: recentByType,
    };
  },
});

export const grantExperience = mutation({
  args: {
    characterId: v.id("earth_characters"),
    amount: v.number(),
    source: v.string(),
    details: v.optional(v.any()),
  },
  handler: async (ctx, { characterId, amount, source, details }) => {
    const character = await ctx.db.get(characterId);
    if (!character) throw new Error("Character not found");

    const currentExp = character.experience ?? 0;
    const newExp = currentExp + amount;
    const levelBefore = character.level;
    const newLevel = Math.floor(Math.sqrt(newExp / 100)) + 1;
    const leveledUp = newLevel > levelBefore;

    const now = Date.now();
    await ctx.db.patch(characterId, {
      experience: newExp,
      level: newLevel,
      updatedAt: now,
    });

    await ctx.db.insert("earth_experienceLogs", {
      characterId: characterId.toString(),
      source,
      experienceGained: amount,
      experienceTotal: newExp,
      levelBefore,
      levelAfter: newLevel,
      leveledUp,
      details,
      createdAt: now,
    });

    return { leveledUp, newLevel, newExp };
  },
});
