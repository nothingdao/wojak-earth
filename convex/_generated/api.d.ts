/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as chat from "../chat.js";
import type * as crons from "../crons.js";
import type * as devTools from "../devTools.js";
import type * as earth_characters from "../earth/characters.js";
import type * as earth_chat from "../earth/chat.js";
import type * as earth_earthLedger from "../earth/earthLedger.js";
import type * as earth_earthLedgerModel from "../earth/earthLedgerModel.js";
import type * as earth_economy from "../earth/economy.js";
import type * as earth_inventory from "../earth/inventory.js";
import type * as earth_items from "../earth/items.js";
import type * as earth_locations from "../earth/locations.js";
import type * as earth_market from "../earth/market.js";
import type * as earth_migrateFromSupabase from "../earth/migrateFromSupabase.js";
import type * as earth_pendingPayments from "../earth/pendingPayments.js";
import type * as earth_stories from "../earth/stories.js";
import type * as earth_storyFlags from "../earth/storyFlags.js";
import type * as earth_transactions from "../earth/transactions.js";
import type * as economySnapshots from "../economySnapshots.js";
import type * as gameConfigValidators from "../gameConfigValidators.js";
import type * as gameSessions from "../gameSessions.js";
import type * as http from "../http.js";
import type * as players from "../players.js";
import type * as prices from "../prices.js";
import type * as profiles from "../profiles.js";
import type * as scores from "../scores.js";
import type * as sessions from "../sessions.js";
import type * as settlements from "../settlements.js";
import type * as spaceDeposits from "../spaceDeposits.js";
import type * as spaceDepositsActions from "../spaceDepositsActions.js";
import type * as spaceTokenLedger from "../spaceTokenLedger.js";
import type * as tokens from "../tokens.js";
import type * as vaultHealth from "../vaultHealth.js";
import type * as verifyPayment from "../verifyPayment.js";
import type * as webhookHandlers from "../webhookHandlers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  chat: typeof chat;
  crons: typeof crons;
  devTools: typeof devTools;
  "earth/characters": typeof earth_characters;
  "earth/chat": typeof earth_chat;
  "earth/earthLedger": typeof earth_earthLedger;
  "earth/earthLedgerModel": typeof earth_earthLedgerModel;
  "earth/economy": typeof earth_economy;
  "earth/inventory": typeof earth_inventory;
  "earth/items": typeof earth_items;
  "earth/locations": typeof earth_locations;
  "earth/market": typeof earth_market;
  "earth/migrateFromSupabase": typeof earth_migrateFromSupabase;
  "earth/pendingPayments": typeof earth_pendingPayments;
  "earth/stories": typeof earth_stories;
  "earth/storyFlags": typeof earth_storyFlags;
  "earth/transactions": typeof earth_transactions;
  economySnapshots: typeof economySnapshots;
  gameConfigValidators: typeof gameConfigValidators;
  gameSessions: typeof gameSessions;
  http: typeof http;
  players: typeof players;
  prices: typeof prices;
  profiles: typeof profiles;
  scores: typeof scores;
  sessions: typeof sessions;
  settlements: typeof settlements;
  spaceDeposits: typeof spaceDeposits;
  spaceDepositsActions: typeof spaceDepositsActions;
  spaceTokenLedger: typeof spaceTokenLedger;
  tokens: typeof tokens;
  vaultHealth: typeof vaultHealth;
  verifyPayment: typeof verifyPayment;
  webhookHandlers: typeof webhookHandlers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
