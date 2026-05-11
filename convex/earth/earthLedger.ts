import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  creditLedger,
  debitLedger,
  displayEarthToRaw,
  getOrCreateLedgerAccount,
} from "./earthLedgerModel";

const ledgerCreditSource = v.union(
  v.literal("starter_credit"),
  v.literal("purchase"),
  v.literal("deposit"),
  v.literal("market_sale"),
  v.literal("admin_adjustment")
);

export const getByCharacter = query({
  args: { characterId: v.id("earth_characters") },
  handler: async (ctx, { characterId }) => {
    const character = await ctx.db.get(characterId);
    if (!character) throw new Error("Character not found");
    const account = await ctx.db
      .query("earth_ledgerAccounts")
      .withIndex("by_character", (q) => q.eq("characterId", characterId.toString()))
      .unique();
    const entries = account
      ? await ctx.db
          .query("earth_ledgerEntries")
          .withIndex("by_account", (q) => q.eq("accountId", account._id))
          .order("desc")
          .take(50)
      : [];
    const withdrawals = account
      ? await ctx.db
          .query("earth_withdrawals")
          .withIndex("by_account_status", (q) => q.eq("accountId", account._id))
          .order("desc")
          .take(50)
      : [];
    return { account, entries, withdrawals };
  },
});

export const getReconciliationView = query({
  args: {
    escrowBalanceRaw: v.optional(v.string()),
  },
  handler: async (ctx, { escrowBalanceRaw }) => {
    const accounts = await ctx.db.query("earth_ledgerAccounts").collect();
    const availableRaw = accounts.reduce((sum, account) => sum + BigInt(account.availableRaw), 0n);
    const pendingWithdrawalRaw = accounts.reduce(
      (sum, account) => sum + BigInt(account.pendingWithdrawalRaw),
      0n
    );
    const liabilitiesRaw = availableRaw + pendingWithdrawalRaw;
    const escrow = escrowBalanceRaw ? BigInt(escrowBalanceRaw) : null;
    const surplusRaw = escrow === null || escrow < liabilitiesRaw ? 0n : escrow - liabilitiesRaw;
    const deficitRaw = escrow === null || escrow >= liabilitiesRaw ? 0n : liabilitiesRaw - escrow;

    return {
      accountCount: accounts.length,
      availableRaw: availableRaw.toString(),
      pendingWithdrawalRaw: pendingWithdrawalRaw.toString(),
      liabilitiesRaw: liabilitiesRaw.toString(),
      escrowBalanceRaw: escrowBalanceRaw ?? null,
      surplusRaw: surplusRaw.toString(),
      deficitRaw: deficitRaw.toString(),
      status: escrow === null ? "unknown" : deficitRaw > 0n ? "deficit" : "backed",
    };
  },
});

export const recordReconciliation = mutation({
  args: {
    escrowMint: v.string(),
    escrowAddress: v.string(),
    escrowBalanceRaw: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, { escrowMint, escrowAddress, escrowBalanceRaw, source }) => {
    const accounts = await ctx.db.query("earth_ledgerAccounts").collect();
    const available = accounts.reduce((sum, account) => sum + BigInt(account.availableRaw), 0n);
    const pending = accounts.reduce((sum, account) => sum + BigInt(account.pendingWithdrawalRaw), 0n);
    const liabilities = available + pending;
    const escrow = BigInt(escrowBalanceRaw);
    const surplus = escrow > liabilities ? escrow - liabilities : 0n;
    const deficit = liabilities > escrow ? liabilities - escrow : 0n;
    return ctx.db.insert("earth_escrowReconciliations", {
      escrowMint,
      escrowAddress,
      escrowBalanceRaw,
      availableRaw: available.toString(),
      pendingWithdrawalRaw: pending.toString(),
      liabilitiesRaw: liabilities.toString(),
      surplusRaw: surplus.toString(),
      deficitRaw: deficit.toString(),
      source: source ?? "manual",
      checkedAt: Date.now(),
    });
  },
});

export const creditFromVaultReceipt = mutation({
  args: {
    characterId: v.id("earth_characters"),
    amountRaw: v.string(),
    source: ledgerCreditSource,
    receiptId: v.string(),
    onChainSignature: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");
    return creditLedger(ctx, { character, ...args });
  },
});

export const spend = mutation({
  args: {
    characterId: v.id("earth_characters"),
    amountRaw: v.string(),
    source: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");
    return debitLedger(ctx, { character, ...args });
  },
});

export const requestWithdrawal = mutation({
  args: {
    characterId: v.id("earth_characters"),
    withdrawalId: v.string(),
    amountRaw: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, { characterId, withdrawalId, amountRaw, expiresAt }) => {
    const character = await ctx.db.get(characterId);
    if (!character) throw new Error("Character not found");
    if (BigInt(amountRaw) <= 0n) throw new Error("Invalid withdrawal amount");
    if (expiresAt <= Date.now()) throw new Error("Withdrawal expiry must be in the future");

    const existing = await ctx.db
      .query("earth_withdrawals")
      .withIndex("by_withdrawal", (q) => q.eq("withdrawalId", withdrawalId))
      .unique();
    if (existing) return existing;

    const account = await getOrCreateLedgerAccount(ctx, character);
    if (!account) throw new Error("Ledger account not found");
    const nextAvailable = BigInt(account.availableRaw) - BigInt(amountRaw);
    if (nextAvailable < 0n) throw new Error("Insufficient in-game EARTH");
    const nextPending = BigInt(account.pendingWithdrawalRaw) + BigInt(amountRaw);
    const now = Date.now();

    await ctx.db.patch(account._id, {
      availableRaw: nextAvailable.toString(),
      pendingWithdrawalRaw: nextPending.toString(),
      updatedAt: now,
    });
    await ctx.db.patch(characterId, {
      earth: Number(nextAvailable) / 1_000_000_000,
      updatedAt: now,
    });
    const recordId = await ctx.db.insert("earth_withdrawals", {
      accountId: account._id,
      characterId: characterId.toString(),
      walletAddress: character.walletAddress,
      withdrawalId,
      amountRaw,
      status: "pending",
      requestedAt: now,
      expiresAt,
    });
    await ctx.db.insert("earth_ledgerEntries", {
      accountId: account._id,
      characterId: characterId.toString(),
      walletAddress: character.walletAddress,
      direction: "debit",
      amountRaw,
      balanceAfterRaw: nextAvailable.toString(),
      source: "withdrawal_pending",
      receiptId: withdrawalId,
      createdAt: now,
    });
    return ctx.db.get(recordId);
  },
});

export const completeWithdrawal = mutation({
  args: {
    withdrawalId: v.string(),
    onChainSignature: v.string(),
  },
  handler: async (ctx, { withdrawalId, onChainSignature }) => {
    const withdrawal = await ctx.db
      .query("earth_withdrawals")
      .withIndex("by_withdrawal", (q) => q.eq("withdrawalId", withdrawalId))
      .unique();
    if (!withdrawal) throw new Error("Withdrawal not found");
    if (withdrawal.status === "completed") return withdrawal;
    if (withdrawal.status !== "pending" && withdrawal.status !== "authorized") {
      throw new Error("Withdrawal cannot be completed");
    }
    const account = await ctx.db.get(withdrawal.accountId);
    if (!account) throw new Error("Ledger account not found");
    const nextPending = BigInt(account.pendingWithdrawalRaw) - BigInt(withdrawal.amountRaw);
    if (nextPending < 0n) throw new Error("Invalid pending withdrawal balance");
    const now = Date.now();
    await ctx.db.patch(account._id, {
      pendingWithdrawalRaw: nextPending.toString(),
      totalDebitedRaw: (BigInt(account.totalDebitedRaw) + BigInt(withdrawal.amountRaw)).toString(),
      updatedAt: now,
    });
    await ctx.db.patch(withdrawal._id, {
      status: "completed",
      onChainSignature,
      completedAt: now,
    });
    return ctx.db.get(withdrawal._id);
  },
});

export const cancelExpiredWithdrawal = mutation({
  args: { withdrawalId: v.string() },
  handler: async (ctx, { withdrawalId }) => {
    const withdrawal = await ctx.db
      .query("earth_withdrawals")
      .withIndex("by_withdrawal", (q) => q.eq("withdrawalId", withdrawalId))
      .unique();
    if (!withdrawal) throw new Error("Withdrawal not found");
    if (withdrawal.status !== "pending" && withdrawal.status !== "authorized") return withdrawal;
    if (withdrawal.expiresAt > Date.now()) throw new Error("Withdrawal has not expired");
    const account = await ctx.db.get(withdrawal.accountId);
    if (!account) throw new Error("Ledger account not found");
    const nextPending = BigInt(account.pendingWithdrawalRaw) - BigInt(withdrawal.amountRaw);
    if (nextPending < 0n) throw new Error("Invalid pending withdrawal balance");
    const nextAvailable = BigInt(account.availableRaw) + BigInt(withdrawal.amountRaw);
    const now = Date.now();
    await ctx.db.patch(account._id, {
      availableRaw: nextAvailable.toString(),
      pendingWithdrawalRaw: nextPending.toString(),
      updatedAt: now,
    });
    await ctx.db.patch(withdrawal._id, { status: "expired", completedAt: now });
    return ctx.db.get(withdrawal._id);
  },
});

export const spendDisplayEarthForCharacter = mutation({
  args: {
    characterId: v.id("earth_characters"),
    amount: v.number(),
    source: v.string(),
  },
  handler: async (ctx, { characterId, amount, source }) => {
    const character = await ctx.db.get(characterId);
    if (!character) throw new Error("Character not found");
    return debitLedger(ctx, {
      character,
      amountRaw: displayEarthToRaw(amount),
      source,
    });
  },
});
