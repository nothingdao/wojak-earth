import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const getStatus = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    const reservations = await ctx.db
      .query("earth_reservations")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .collect();

    if (reservations.length === 0) {
      return {
        hasReservation: false,
        latestStatus: null,
        latestTransaction: null,
        reservationCount: 0,
        totalAmount: 0,
      };
    }

    const sorted = reservations.sort((a, b) => b.createdAt - a.createdAt);
    const latest = sorted[0];
    const confirmed = reservations.filter((r) => r.status === "confirmed");
    const totalAmount = confirmed.reduce((sum, r) => sum + r.amountSol, 0);

    return {
      hasReservation: true,
      latestStatus: latest.status,
      latestTransaction: latest.transactionSignature,
      reservationCount: reservations.length,
      totalAmount,
    };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("earth_reservations").collect();
    const confirmed = all.filter((r) => r.status === "confirmed");
    const pending = all.filter((r) => r.status === "pending");
    const failed = all.filter((r) => r.status === "failed");
    const totalSol = confirmed.reduce((sum, r) => sum + r.amountSol, 0);
    const sorted = all.sort((a, b) => a.createdAt - b.createdAt);

    return {
      totalReservations: all.length,
      confirmedReservations: confirmed.length,
      pendingReservations: pending.length,
      failedReservations: failed.length,
      totalConfirmedSol: totalSol,
      avgReservationAmount: confirmed.length > 0 ? totalSol / confirmed.length : 0,
      firstReservationDate: sorted[0]?.createdAt ?? null,
      latestReservationDate: sorted[sorted.length - 1]?.createdAt ?? null,
    };
  },
});

export const create = mutation({
  args: {
    walletAddress: v.string(),
    transactionSignature: v.string(),
    amountSol: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("earth_reservations", {
      ...args,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const confirm = mutation({
  args: { reservationId: v.id("earth_reservations") },
  handler: async (ctx, { reservationId }) => {
    await ctx.db.patch(reservationId, {
      status: "confirmed",
      updatedAt: Date.now(),
    });
  },
});
