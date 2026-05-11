import type { Id } from "../_generated/dataModel";

export const EARTH_DECIMALS = 9n;
export const EARTH_SCALE = 1_000_000_000n;

export type LedgerCharacter = {
  _id: Id<"earth_characters">;
  walletAddress: string;
  earth: number;
};

export function displayEarthToRaw(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid EARTH amount");
  }
  return BigInt(Math.round(amount * Number(EARTH_SCALE))).toString();
}

export function rawToDisplayEarth(raw: bigint): number {
  return Number(raw) / Number(EARTH_SCALE);
}

function addRaw(a: string, b: string): string {
  return (BigInt(a) + BigInt(b)).toString();
}

function subRaw(a: string, b: string): string {
  const result = BigInt(a) - BigInt(b);
  if (result < 0n) throw new Error("Insufficient in-game EARTH");
  return result.toString();
}

export async function getOrCreateLedgerAccount(ctx: any, character: LedgerCharacter) {
  const characterId = character._id.toString();
  const existing = await ctx.db
    .query("earth_ledgerAccounts")
    .withIndex("by_character", (q: any) => q.eq("characterId", characterId))
    .unique();
  if (existing) return existing;

  const now = Date.now();
  const initialRaw = "0";
  const accountId = await ctx.db.insert("earth_ledgerAccounts", {
    characterId,
    walletAddress: character.walletAddress,
    availableRaw: initialRaw,
    pendingWithdrawalRaw: "0",
    totalCreditedRaw: "0",
    totalDebitedRaw: "0",
    createdAt: now,
    updatedAt: now,
  });
  return ctx.db.get(accountId);
}

export async function creditLedger(ctx: any, args: {
  character: LedgerCharacter;
  amountRaw: string;
  source: string;
  receiptId?: string;
  onChainSignature?: string;
  metadata?: unknown;
}) {
  if (BigInt(args.amountRaw) <= 0n) throw new Error("Invalid credit amount");
  const account = await getOrCreateLedgerAccount(ctx, args.character);
  if (!account) throw new Error("Ledger account not found");

  if (args.receiptId) {
    const existingReceipt = await ctx.db
      .query("earth_ledgerEntries")
      .withIndex("by_source_receipt", (q: any) =>
        q.eq("source", args.source).eq("receiptId", args.receiptId)
      )
      .unique();
    if (existingReceipt) return { account, entry: existingReceipt, idempotent: true };
  }

  const now = Date.now();
  const nextAvailable = addRaw(account.availableRaw, args.amountRaw);
  await ctx.db.patch(account._id, {
    availableRaw: nextAvailable,
    totalCreditedRaw: addRaw(account.totalCreditedRaw, args.amountRaw),
    updatedAt: now,
  });
  await ctx.db.patch(args.character._id, {
    earth: rawToDisplayEarth(BigInt(nextAvailable)),
    updatedAt: now,
  });
  const entryId = await ctx.db.insert("earth_ledgerEntries", {
    accountId: account._id,
    characterId: args.character._id.toString(),
    walletAddress: args.character.walletAddress,
    direction: "credit",
    amountRaw: args.amountRaw,
    balanceAfterRaw: nextAvailable,
    source: args.source,
    receiptId: args.receiptId,
    onChainSignature: args.onChainSignature,
    metadata: args.metadata,
    createdAt: now,
  });
  return { account: await ctx.db.get(account._id), entry: await ctx.db.get(entryId), idempotent: false };
}

export async function debitLedger(ctx: any, args: {
  character: LedgerCharacter;
  amountRaw: string;
  source: string;
  metadata?: unknown;
}) {
  if (BigInt(args.amountRaw) <= 0n) throw new Error("Invalid debit amount");
  const account = await getOrCreateLedgerAccount(ctx, args.character);
  if (!account) throw new Error("Ledger account not found");

  const now = Date.now();
  const nextAvailable = subRaw(account.availableRaw, args.amountRaw);
  await ctx.db.patch(account._id, {
    availableRaw: nextAvailable,
    totalDebitedRaw: addRaw(account.totalDebitedRaw, args.amountRaw),
    updatedAt: now,
  });
  await ctx.db.patch(args.character._id, {
    earth: rawToDisplayEarth(BigInt(nextAvailable)),
    updatedAt: now,
  });
  const entryId = await ctx.db.insert("earth_ledgerEntries", {
    accountId: account._id,
    characterId: args.character._id.toString(),
    walletAddress: args.character.walletAddress,
    direction: "debit",
    amountRaw: args.amountRaw,
    balanceAfterRaw: nextAvailable,
    source: args.source,
    metadata: args.metadata,
    createdAt: now,
  });
  return { account: await ctx.db.get(account._id), entry: await ctx.db.get(entryId) };
}
