export const SPAWN_TICKET_TTL_MS = 60_000;
export const MIN_ESCALATING_SPAWN_INTERVAL_S = 5;
export function statusForRemaining(remainingAmount, tokensPerPill) {
    return remainingAmount < tokensPerPill ? "depleted" : "active";
}
export function validateDepositAmounts({ totalAmount, remainingAmount, tokensPerPill, }) {
    if (remainingAmount < 0 ||
        tokensPerPill <= 0 ||
        remainingAmount > totalAmount) {
        throw new Error("Invalid deposit amounts");
    }
}
export function remainingAfterCollection(deposit) {
    const remainingAmount = deposit.remainingAmount - deposit.tokensPerPill;
    return {
        remainingAmount,
        status: statusForRemaining(remainingAmount, deposit.tokensPerPill),
    };
}
export function canPoolSpawnOrCollect(deposit) {
    if (!deposit || deposit.status === "cancelled")
        return false;
    return deposit.remainingAmount >= deposit.tokensPerPill;
}
export function canIssueSpawnTicket({ policy, now, level, lastIssuedAt, ticketsInWindow = 0, }) {
    const spawnMode = policy.spawnMode ?? "steady";
    const spawnInterval = policy.spawnInterval ?? 30;
    if (spawnMode === "steady") {
        return !lastIssuedAt || now - lastIssuedAt >= spawnInterval * 1000;
    }
    if (spawnMode === "escalating") {
        const rate = policy.escalationRate ?? 0.1;
        const effectiveInterval = Math.max(MIN_ESCALATING_SPAWN_INTERVAL_S, spawnInterval / (1 + rate * Math.max(1, level))) * 1000;
        return !lastIssuedAt || now - lastIssuedAt >= effectiveInterval;
    }
    const waveSize = policy.waveSize ?? 3;
    return ticketsInWindow < waveSize;
}
export function waveWindowStart(now, policy) {
    return now - (policy.waveCooldown ?? 60) * 1000;
}
export function canUseSpawnTicket(ticket, args) {
    if (!ticket)
        return false;
    if (ticket.used)
        return false;
    if (ticket.expiresAt < args.now)
        return false;
    if (ticket.playerWalletAddress !== args.playerWalletAddress)
        return false;
    if (ticket.gameSessionId !== args.gameSessionId)
        return false;
    return true;
}
export function canReserveCollection(status) {
    return status === "pending";
}
export function canRevertClaimingCollection(status) {
    return status === "claiming";
}
export function groupCollectionsByDeposit(collections) {
    const byDeposit = new Map();
    for (const collection of collections) {
        const key = String(collection.depositId);
        const group = byDeposit.get(key);
        if (group)
            group.push(collection);
        else
            byDeposit.set(key, [collection]);
    }
    return byDeposit;
}
export function sumCollectionAmounts(collections) {
    return collections.reduce((sum, collection) => sum + collection.amount, 0);
}
export function hasClaimableAmount(collections) {
    return sumCollectionAmounts(collections) > 0;
}
