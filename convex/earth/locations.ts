import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("earth_locations").collect();
  },
});

export const getById = query({
  args: { locationId: v.id("earth_locations") },
  handler: async (ctx, { locationId }) => {
    return ctx.db.get(locationId);
  },
});

export const getResources = query({
  args: { locationId: v.string() },
  handler: async (ctx, { locationId }) => {
    const resources = await ctx.db
      .query("earth_locationResources")
      .withIndex("by_location", (q) => q.eq("locationId", locationId))
      .collect();

    return Promise.all(
      resources.map(async (r) => {
        const item = await ctx.db
          .query("earth_items")
          .filter((q) => q.eq(q.field("_id"), r.itemId))
          .unique();
        return { ...r, item };
      })
    );
  },
});

export const getPlayersAt = query({
  args: { locationId: v.string() },
  handler: async (ctx, { locationId }) => {
    return ctx.db
      .query("earth_characters")
      .withIndex("by_location", (q) => q.eq("currentLocationId", locationId))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .collect();
  },
});

const locationPatchValidator = v.object({
  slug: v.optional(v.string()),
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  locationType: v.optional(v.string()),
  chatScope: v.optional(v.union(v.literal("LOCAL"), v.literal("REGIONAL"), v.literal("GLOBAL"))),
  difficulty: v.optional(v.number()),
  hasChat: v.optional(v.boolean()),
  hasMarket: v.optional(v.boolean()),
  hasMining: v.optional(v.boolean()),
  hasTravel: v.optional(v.boolean()),
  hasExchange: v.optional(v.boolean()),
  isPrivate: v.optional(v.boolean()),
  parentLocationId: v.optional(v.string()),
  biome: v.optional(v.string()),
  territory: v.optional(v.string()),
  theme: v.optional(v.string()),
  lore: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  mapRegionId: v.optional(v.string()),
  svgPathId: v.optional(v.string()),
  mapX: v.optional(v.number()),
  mapY: v.optional(v.number()),
  minLevel: v.optional(v.number()),
  entryCost: v.optional(v.number()),
  status: v.optional(v.string()),
  isExplored: v.optional(v.boolean()),
  welcomeMessage: v.optional(v.string()),
});

export const upsert = mutation({
  args: {
    slug: v.optional(v.string()),
    name: v.string(),
    description: v.string(),
    locationType: v.string(),
    chatScope: v.union(
      v.literal("LOCAL"),
      v.literal("REGIONAL"),
      v.literal("GLOBAL")
    ),
    difficulty: v.number(),
    hasChat: v.boolean(),
    hasMarket: v.boolean(),
    hasMining: v.boolean(),
    hasTravel: v.boolean(),
    hasExchange: v.boolean(),
    isPrivate: v.boolean(),
    parentLocationId: v.optional(v.string()),
    biome: v.optional(v.string()),
    mapRegionId: v.optional(v.string()),
    svgPathId: v.optional(v.string()),
    mapX: v.optional(v.number()),
    mapY: v.optional(v.number()),
    minLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("earth_locations", {
      ...args,
      playerCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const adminUpdate = mutation({
  args: {
    locationId: v.id("earth_locations"),
    updates: locationPatchValidator,
  },
  handler: async (ctx, { locationId, updates }) => {
    const location = await ctx.db.get(locationId);
    if (!location) throw new Error("Location not found");
    await ctx.db.patch(locationId, { ...updates, updatedAt: Date.now() });
    return { success: true };
  },
});

export const adminNormalizeMapModel = mutation({
  args: { validMapRegionIds: v.optional(v.array(v.string())) },
  handler: async (ctx, { validMapRegionIds }) => {
    const locations = await ctx.db.query("earth_locations").collect();
    const validRegions = validMapRegionIds ? new Set(validMapRegionIds) : null;
    const parentByReference = new Map<string, typeof locations[number]>();

    for (const location of locations) {
      parentByReference.set(location._id.toString(), location);
      const legacyId = (location as any).legacyId;
      const slug = (location as any).slug;
      if (legacyId) parentByReference.set(String(legacyId), location);
      if (slug) parentByReference.set(String(slug), location);
    }

    let updated = 0;
    const now = Date.now();

    const chooseMapRegionId = (location: typeof locations[number]) => {
      const slug = (location as any).slug;
      const legacyId = (location as any).legacyId;
      const mapRegionId = (location as any).mapRegionId;
      const svgPathId = (location as any).svgPathId;
      const candidates = [slug, legacyId, mapRegionId, svgPathId].filter(Boolean).map(String);
      if (!validRegions) return mapRegionId || svgPathId || legacyId || slug;
      return candidates.find((candidate) => validRegions.has(candidate));
    };

    for (const location of locations) {
      const patch: Record<string, string | number> = { updatedAt: now };
      const existingSlug = (location as any).slug;
      const legacyId = (location as any).legacyId;
      const existingMapRegionId = (location as any).mapRegionId;
      const nextMapRegionId = chooseMapRegionId(location);

      if (!existingSlug && legacyId) patch.slug = String(legacyId);
      if (nextMapRegionId && existingMapRegionId !== nextMapRegionId) {
        patch.mapRegionId = nextMapRegionId;
      }

      const parentReference = location.parentLocationId;
      if (parentReference) {
        const parent = parentByReference.get(parentReference);
        if (parent && parent._id.toString() !== parentReference) {
          patch.parentLocationId = parent._id.toString();
        }
      }

      if (Object.keys(patch).length > 1) {
        await ctx.db.patch(location._id, patch as any);
        updated++;
      }
    }

    return { success: true, updated, total: locations.length };
  },
});
