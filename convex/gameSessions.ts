import {
  httpAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    const verifiedSession = await ctx.db
      .query("verifiedSessions")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .order("desc")
      .first();

    if (
      !verifiedSession ||
      verifiedSession.expiresAt <= Date.now() ||
      verifiedSession.consumed === true
    ) {
      throw new Error("No active paid session. Please insert a quarter.");
    }

    await ctx.db.patch(verifiedSession._id, { consumed: true });

    return await ctx.db.insert("gameSessions", {
      walletAddress,
      score: 0,
      levelReached: 1,
      pillsCollected: 0,
      sessionStart: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      status: "active",
    });
  },
});

export const update = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    score: v.optional(v.number()),
    levelReached: v.optional(v.number()),
    pillsCollected: v.optional(v.number()),
    status: v.optional(
      v.union(v.literal("active"), v.literal("ending"), v.literal("ended"))
    ),
  },
  handler: async (ctx, { sessionId, ...fields }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");

    const updates: Record<string, unknown> = {
      lastUpdated: new Date().toISOString(),
    };
    if (fields.score !== undefined) updates.score = fields.score;
    if (fields.levelReached !== undefined)
      updates.levelReached = fields.levelReached;
    if (fields.pillsCollected !== undefined)
      updates.pillsCollected = fields.pillsCollected;
    if (fields.status !== undefined) {
      updates.status = fields.status;
      if (fields.status === "ended")
        updates.sessionEnd = new Date().toISOString();
    }

    await ctx.db.patch(sessionId, updates);
    return await ctx.db.get(sessionId);
  },
});

// Only callable from trusted server-side Convex functions (not the browser).
export const setAstrdsEarned = internalMutation({
  args: {
    sessionId: v.id("gameSessions"),
    amount: v.number(),
    amountRaw: v.optional(v.string()),
    allocated: v.optional(v.number()),
    burned: v.optional(v.number()),
    allocatedRaw: v.optional(v.string()),
    burnedRaw: v.optional(v.string()),
    settlementTxSignature: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, amount, amountRaw, allocated, burned, allocatedRaw, burnedRaw, settlementTxSignature }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");
    await ctx.db.patch(sessionId, {
      astrdsEarned: amount,
      astrdsEarnedRaw: amountRaw,
      astrdsAllocated: allocated,
      astrdsBurned: burned,
      astrdsAllocatedRaw: allocatedRaw,
      astrdsBurnedRaw: burnedRaw,
      settlementTxSignature,
      lastUpdated: new Date().toISOString(),
    });
  },
});

export const setSettlementTxSignature = internalMutation({
  args: {
    sessionId: v.id("gameSessions"),
    txSignature: v.string(),
  },
  handler: async (ctx, { sessionId, txSignature }) => {
    await ctx.db.patch(sessionId, {
      settlementTxSignature: txSignature,
      lastUpdated: new Date().toISOString(),
    });
  },
});

// HTTP endpoint for the game server. Validates ADMIN_API_KEY then calls
// the internal mutation — the browser never has access to call this path directly.
export const setAstrdsEarnedHttp = httpAction(async (ctx, request) => {
  const apiKey = process.env.ADMIN_API_KEY;
  if (!apiKey) return new Response("Not configured", { status: 503 });

  if (request.headers.get("Authorization") !== `Bearer ${apiKey}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { sessionId, amount, amountRaw, allocated, burned, allocatedRaw, burnedRaw, settlementTxSignature } = body as Record<
    string,
    unknown
  >;
  if (
    typeof sessionId !== "string" ||
    typeof amount !== "number" ||
    amount < 0 ||
    amount > 50
  ) {
    return new Response("Invalid body", { status: 400 });
  }
  for (const [name, value] of Object.entries({ amountRaw, allocatedRaw, burnedRaw })) {
    if (value !== undefined && (typeof value !== "string" || !/^\d+$/.test(value))) {
      return new Response(`Invalid ${name}`, { status: 400 });
    }
  }

  await ctx.runMutation(internal.gameSessions.setAstrdsEarned, {
    sessionId: sessionId as Id<"gameSessions">,
    amount,
    amountRaw: amountRaw as string | undefined,
    allocated: typeof allocated === "number" ? allocated : undefined,
    burned: typeof burned === "number" ? burned : undefined,
    allocatedRaw: allocatedRaw as string | undefined,
    burnedRaw: burnedRaw as string | undefined,
    settlementTxSignature: typeof settlementTxSignature === "string" ? settlementTxSignature : undefined,
  });

  let settlementSubmit: unknown = undefined;
  const session = await ctx.runQuery(internal.gameSessions.getInternal, {
    sessionId,
  });
  const effectiveAmountRaw = typeof amountRaw === "string" ? amountRaw : Math.round(amount * 1_000_000_000).toString();
  const effectiveAllocatedRaw = typeof allocatedRaw === "string" ? allocatedRaw : "50000000000";
  if (session?.walletAddress) {
    settlementSubmit = await ctx.runAction(internal.settlements.submitAstrdsSettlement, {
      sessionId,
      walletAddress: session.walletAddress,
      amountRaw: effectiveAmountRaw,
      allocatedRaw: effectiveAllocatedRaw,
      score: session.score ?? 0,
      level: session.levelReached ?? 1,
      pillsCollected: session.pillsCollected ?? 0,
    });
  }

  return new Response(JSON.stringify({ ok: true, settlementSubmit }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

export const incrementPillsCollected = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, { sessionId, amount }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");

    const nextAmount = Math.max(0, amount ?? 1);
    await ctx.db.patch(sessionId, {
      pillsCollected: (session.pillsCollected ?? 0) + nextAmount,
      lastUpdated: new Date().toISOString(),
    });

    return await ctx.db.get(sessionId);
  },
});

export const get = query({
  args: { sessionId: v.id("gameSessions") },
  handler: async (ctx, { sessionId }) => ctx.db.get(sessionId),
});

export const isActiveForWallet = query({
  args: { sessionId: v.id("gameSessions"), walletAddress: v.string() },
  handler: async (ctx, { sessionId, walletAddress }) => {
    const session = await ctx.db.get(sessionId);
    return Boolean(
      session &&
        session.walletAddress === walletAddress &&
        session.status === "active"
    );
  },
});

export const getInternal = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    return ctx.db.get(sessionId as Id<"gameSessions">);
  },
});

export const getByWallet = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    return await ctx.db
      .query("gameSessions")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .order("desc")
      .take(50);
  },
});

export const getTotalGamesPlayed = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("gameSessions").collect();
    return sessions.filter((session) => session.status === "ended").length;
  },
});
