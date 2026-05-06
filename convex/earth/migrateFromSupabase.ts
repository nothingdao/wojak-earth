import { v } from "convex/values";
import { mutation } from "../_generated/server";

const nowFrom = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
};

const clean = <T extends Record<string, unknown>>(obj: T): T => {
  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined || obj[key] === null) delete obj[key];
  }
  return obj;
};

const toUpper = (value: unknown, fallback: string) =>
  String(value ?? fallback).toUpperCase();

export const importCore = mutation({
  args: { payload: v.any() },
  handler: async (ctx, { payload }) => {
    const inserted = {
      locations: 0,
      items: 0,
      equipmentSlots: 0,
      locationResources: 0,
      marketListings: 0,
    };
    const skipped = { locations: 0, items: 0, equipmentSlots: 0, locationResources: 0, marketListings: 0 };

    const existingLocations = await ctx.db.query("earth_locations").collect();
    const locationByLegacy = new Map<string, string>();
    const locationByName = new Map(existingLocations.map((l) => [l.name, l._id.toString()]));
    for (const loc of existingLocations) {
      if ((loc as any).legacyId) locationByLegacy.set((loc as any).legacyId, loc._id.toString());
    }

    for (const loc of payload.locations ?? []) {
      const legacyId = String(loc.id ?? "");
      if (!legacyId) continue;
      if (locationByLegacy.has(legacyId) || locationByName.has(loc.name)) {
        locationByLegacy.set(legacyId, locationByLegacy.get(legacyId) ?? locationByName.get(loc.name)!);
        skipped.locations++;
        continue;
      }
      const id = await ctx.db.insert("earth_locations", clean({
        legacyId,
        name: String(loc.name ?? legacyId),
        description: String(loc.description ?? ""),
        locationType: String(loc.location_type ?? "LOCATION"),
        chatScope: toUpper(loc.chat_scope, "LOCAL") as "LOCAL" | "REGIONAL" | "GLOBAL",
        difficulty: Number(loc.difficulty ?? 1),
        hasChat: Boolean(loc.has_chat ?? true),
        hasMarket: Boolean(loc.has_market ?? false),
        hasMining: Boolean(loc.has_mining ?? false),
        hasTravel: Boolean(loc.has_travel ?? true),
        hasExchange: Boolean(loc.has_exchange ?? false),
        isPrivate: Boolean(loc.is_private ?? false),
        playerCount: Number(loc.player_count ?? 0),
        parentLocationId: loc.parent_location_id ? String(loc.parent_location_id) : undefined,
        biome: loc.biome ? String(loc.biome) : undefined,
        territory: loc.territory ? String(loc.territory) : undefined,
        theme: loc.theme ? String(loc.theme) : undefined,
        lore: loc.lore ? String(loc.lore) : undefined,
        imageUrl: loc.image_url ? String(loc.image_url) : undefined,
        svgPathId: loc.svg_path_id ? String(loc.svg_path_id) : undefined,
        mapX: loc.map_x == null ? undefined : Number(loc.map_x),
        mapY: loc.map_y == null ? undefined : Number(loc.map_y),
        minLevel: loc.min_level == null ? undefined : Number(loc.min_level),
        entryCost: loc.entry_cost == null ? undefined : Number(loc.entry_cost),
        status: loc.status ? String(loc.status) : undefined,
        isExplored: loc.is_explored == null ? undefined : Boolean(loc.is_explored),
        welcomeMessage: loc.welcome_message ? String(loc.welcome_message) : undefined,
        lastActive: loc.last_active ? nowFrom(loc.last_active) : undefined,
        createdAt: nowFrom(loc.created_at),
        updatedAt: nowFrom(loc.updated_at),
      }));
      locationByLegacy.set(legacyId, id.toString());
      inserted.locations++;
    }

    const existingItems = await ctx.db.query("earth_items").collect();
    const itemByLegacy = new Map<string, string>();
    const itemByName = new Map(existingItems.map((i) => [i.name, i._id.toString()]));
    for (const item of existingItems) {
      if ((item as any).legacyId) itemByLegacy.set((item as any).legacyId, item._id.toString());
    }

    const validCategories = new Set(["CLOTHING", "HAT", "ACCESSORY", "TOOL", "CONSUMABLE", "MATERIAL"]);
    const validRarities = new Set(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]);

    for (const item of payload.items ?? []) {
      const legacyId = String(item.id ?? "");
      if (!legacyId) continue;
      if (itemByLegacy.has(legacyId) || itemByName.has(item.name)) {
        itemByLegacy.set(legacyId, itemByLegacy.get(legacyId) ?? itemByName.get(item.name)!);
        skipped.items++;
        continue;
      }
      let category = toUpper(item.category, "MATERIAL");
      if (!validCategories.has(category)) category = "MATERIAL";
      let rarity = toUpper(item.rarity, "COMMON");
      if (!validRarities.has(rarity)) rarity = "COMMON";
      const id = await ctx.db.insert("earth_items", clean({
        legacyId,
        name: String(item.name ?? legacyId),
        description: String(item.description ?? ""),
        category: category as any,
        rarity: rarity as any,
        layerType: item.layer_type ? toUpper(item.layer_type, "") as any : undefined,
        layerFile: item.layer_file ? String(item.layer_file) : undefined,
        layerGender: item.layer_gender ? String(item.layer_gender) : undefined,
        layerOrder: item.layer_order == null ? undefined : Number(item.layer_order),
        baseLayerFile: item.base_layer_file ? String(item.base_layer_file) : undefined,
        imageUrl: item.image_url ? String(item.image_url) : undefined,
        isVisual: item.is_visual == null ? undefined : Boolean(item.is_visual),
        hasGenderVariants: item.has_gender_variants == null ? undefined : Boolean(item.has_gender_variants),
        healthEffect: item.health_effect == null ? undefined : Number(item.health_effect),
        energyEffect: item.energy_effect == null ? undefined : Number(item.energy_effect),
        durability: item.durability == null ? undefined : Number(item.durability),
        compatibilityRules: item.compatibility_rules ?? undefined,
        createdAt: nowFrom(item.created_at),
        updatedAt: nowFrom(item.updated_at),
      }));
      itemByLegacy.set(legacyId, id.toString());
      inserted.items++;
    }

    const existingSlots = await ctx.db.query("earth_equipmentSlots").collect();
    const slotNames = new Set(existingSlots.map((s) => s.name));
    for (const slot of payload.equipmentSlots ?? []) {
      if (slotNames.has(slot.name)) { skipped.equipmentSlots++; continue; }
      await ctx.db.insert("earth_equipmentSlots", clean({
        legacyId: slot.id ? String(slot.id) : undefined,
        name: String(slot.name ?? slot.id),
        category: slot.category ? String(slot.category) : undefined,
        layerType: slot.layer_type ? String(slot.layer_type) : undefined,
        isActive: slot.is_active == null ? undefined : Boolean(slot.is_active),
        unlockLevel: slot.unlock_level == null ? undefined : Number(slot.unlock_level),
        maxSlotsBase: slot.max_slots_base == null ? undefined : Number(slot.max_slots_base),
        maxSlotsPerLevel: slot.max_slots_per_level == null ? undefined : Number(slot.max_slots_per_level),
        maxSlotsTotal: slot.max_slots_total == null ? undefined : Number(slot.max_slots_total),
        sortOrder: slot.sort_order == null ? undefined : Number(slot.sort_order),
        createdAt: nowFrom(slot.created_at),
      }));
      inserted.equipmentSlots++;
    }

    const existingResources = await ctx.db.query("earth_locationResources").collect();
    const resourceKeys = new Set(existingResources.map((r) => `${r.locationId}:${r.itemId}`));
    for (const resource of payload.locationResources ?? []) {
      const locationId = locationByLegacy.get(String(resource.location_id ?? "")) ?? String(resource.location_id ?? "");
      const itemId = itemByLegacy.get(String(resource.item_id ?? "")) ?? String(resource.item_id ?? "");
      if (!locationId || !itemId) continue;
      const key = `${locationId}:${itemId}`;
      if (resourceKeys.has(key)) { skipped.locationResources++; continue; }
      await ctx.db.insert("earth_locationResources", clean({
        legacyId: resource.id ? String(resource.id) : undefined,
        locationId,
        itemId,
        spawnRate: Number(resource.spawn_rate ?? 1),
        difficulty: Number(resource.difficulty ?? 1),
        maxPerDay: resource.max_per_day == null ? undefined : Number(resource.max_per_day),
      }));
      resourceKeys.add(key);
      inserted.locationResources++;
    }

    const existingListings = await ctx.db.query("earth_marketListings").collect();
    const listingKeys = new Set(existingListings.map((l) => `${l.locationId}:${l.itemId}:${l.price}`));
    for (const listing of payload.marketListings ?? []) {
      const locationId = locationByLegacy.get(String(listing.location_id ?? "")) ?? String(listing.location_id ?? "");
      const itemId = itemByLegacy.get(String(listing.item_id ?? "")) ?? String(listing.item_id ?? "");
      if (!locationId || !itemId) continue;
      const price = Number(listing.price ?? 0);
      const key = `${locationId}:${itemId}:${price}`;
      if (listingKeys.has(key)) { skipped.marketListings++; continue; }
      await ctx.db.insert("earth_marketListings", clean({
        legacyId: listing.id ? String(listing.id) : undefined,
        locationId,
        itemId,
        price,
        quantity: Number(listing.quantity ?? 1),
        isSystemItem: Boolean(listing.is_system_item ?? true),
        sellerId: listing.seller_id ? String(listing.seller_id) : undefined,
        createdAt: nowFrom(listing.created_at),
        updatedAt: nowFrom(listing.updated_at),
      }));
      listingKeys.add(key);
      inserted.marketListings++;
    }

    return { inserted, skipped };
  },
});
