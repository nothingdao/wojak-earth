import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("earth_stories").collect();
  },
});

export const getWithChapters = query({
  args: { storyId: v.id("earth_stories") },
  handler: async (ctx, { storyId }) => {
    const story = await ctx.db.get(storyId);
    if (!story) return null;

    const chapters = await ctx.db
      .query("earth_chapters")
      .withIndex("by_story", (q) => q.eq("storyId", storyId.toString()))
      .collect();

    const chaptersWithEvents = await Promise.all(
      chapters.map(async (chapter) => {
        const events = await ctx.db
          .query("earth_events")
          .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id.toString()))
          .collect();

        const eventsWithChoices = await Promise.all(
          events.map(async (event) => {
            const choices = await ctx.db
              .query("earth_choices")
              .withIndex("by_event", (q) => q.eq("eventId", event._id.toString()))
              .collect();

            const choicesWithConsequences = await Promise.all(
              choices.map(async (choice) => {
                const consequences = await ctx.db
                  .query("earth_consequences")
                  .withIndex("by_choice", (q) => q.eq("choiceId", choice._id.toString()))
                  .collect();
                return { ...choice, consequences };
              })
            );

            return { ...event, choices: choicesWithConsequences };
          })
        );

        return { ...chapter, events: eventsWithChoices };
      })
    );

    return { ...story, chapters: chaptersWithEvents };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    characterPath: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("earth_stories", { ...args, createdAt: now, updatedAt: now });
  },
});

export const getChapterWithContent = query({
  args: { chapterId: v.string() },
  handler: async (ctx, { chapterId }) => {
    // Find the chapter by iterating (chapterId is a Convex ID string)
    const chapters = await ctx.db.query("earth_chapters").collect();
    const chapter = chapters.find((c) => c._id.toString() === chapterId);
    if (!chapter) return null;

    const events = await ctx.db
      .query("earth_events")
      .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id.toString()))
      .collect();

    const sortedEvents = [...events].sort((a, b) => a.orderIndex - b.orderIndex);

    const eventsWithChoices = await Promise.all(
      sortedEvents.map(async (event) => {
        const choices = await ctx.db
          .query("earth_choices")
          .withIndex("by_event", (q) => q.eq("eventId", event._id.toString()))
          .collect();

        const sortedChoices = [...choices].sort((a, b) => a.orderIndex - b.orderIndex);

        const choicesWithConsequences = await Promise.all(
          sortedChoices.map(async (choice) => {
            const consequences = await ctx.db
              .query("earth_consequences")
              .withIndex("by_choice", (q) => q.eq("choiceId", choice._id.toString()))
              .collect();
            return { ...choice, consequences };
          })
        );

        return { ...event, choices: choicesWithConsequences };
      })
    );

    return { ...chapter, events: eventsWithChoices };
  },
});

export const completeChapter = mutation({
  args: {
    characterId: v.string(),
    chapterId: v.string(),
  },
  handler: async (ctx, { characterId, chapterId }) => {
    const flagName = `chapter_completed_${chapterId}`;
    const existing = await ctx.db
      .query("earth_storyFlags")
      .withIndex("by_character_flag", (q) =>
        q.eq("characterId", characterId).eq("flagName", flagName)
      )
      .unique();
    if (existing) return;
    const now = Date.now();
    await ctx.db.insert("earth_storyFlags", {
      characterId,
      flagName,
      flagValue: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { storyId: v.id("earth_stories") },
  handler: async (ctx, { storyId }) => {
    const chapters = await ctx.db
      .query("earth_chapters")
      .withIndex("by_story", (q) => q.eq("storyId", storyId.toString()))
      .collect();

    for (const chapter of chapters) {
      const events = await ctx.db
        .query("earth_events")
        .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id.toString()))
        .collect();

      for (const event of events) {
        const choices = await ctx.db
          .query("earth_choices")
          .withIndex("by_event", (q) => q.eq("eventId", event._id.toString()))
          .collect();

        for (const choice of choices) {
          const consequences = await ctx.db
            .query("earth_consequences")
            .withIndex("by_choice", (q) => q.eq("choiceId", choice._id.toString()))
            .collect();
          for (const c of consequences) await ctx.db.delete(c._id);
          await ctx.db.delete(choice._id);
        }
        await ctx.db.delete(event._id);
      }
      await ctx.db.delete(chapter._id);
    }

    await ctx.db.delete(storyId);
  },
});

// ── Story update ────────────────────────────────────────────────────────────
export const update = mutation({
  args: { storyId: v.id("earth_stories"), updates: v.any() },
  handler: async (ctx, { storyId, updates }) => {
    await ctx.db.patch(storyId, { ...updates, updatedAt: Date.now() });
  },
});

// ── Chapter CRUD ─────────────────────────────────────────────────────────────
export const listChapters = query({
  args: { storyId: v.string() },
  handler: async (ctx, { storyId }) => {
    return ctx.db
      .query("earth_chapters")
      .withIndex("by_story", (q) => q.eq("storyId", storyId))
      .collect();
  },
});

export const createChapter = mutation({
  args: {
    storyId: v.string(),
    title: v.string(),
    chapterNumber: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("earth_chapters", { ...args, createdAt: now });
  },
});

export const updateChapter = mutation({
  args: { chapterId: v.string(), updates: v.any() },
  handler: async (ctx, { chapterId, updates }) => {
    const chapters = await ctx.db.query("earth_chapters").collect();
    const chapter = chapters.find((c) => c._id.toString() === chapterId);
    if (!chapter) throw new Error("Chapter not found");
    await ctx.db.patch(chapter._id, updates);
  },
});

export const removeChapter = mutation({
  args: { chapterId: v.string() },
  handler: async (ctx, { chapterId }) => {
    const chapters = await ctx.db.query("earth_chapters").collect();
    const chapter = chapters.find((c) => c._id.toString() === chapterId);
    if (!chapter) throw new Error("Chapter not found");

    const events = await ctx.db
      .query("earth_events")
      .withIndex("by_chapter", (q) => q.eq("chapterId", chapterId))
      .collect();
    for (const event of events) {
      const choices = await ctx.db
        .query("earth_choices")
        .withIndex("by_event", (q) => q.eq("eventId", event._id.toString()))
        .collect();
      for (const choice of choices) {
        const consequences = await ctx.db
          .query("earth_consequences")
          .withIndex("by_choice", (q) => q.eq("choiceId", choice._id.toString()))
          .collect();
        for (const c of consequences) await ctx.db.delete(c._id);
        await ctx.db.delete(choice._id);
      }
      await ctx.db.delete(event._id);
    }
    await ctx.db.delete(chapter._id);
  },
});

// ── Event CRUD ───────────────────────────────────────────────────────────────
export const listEvents = query({
  args: { chapterId: v.string() },
  handler: async (ctx, { chapterId }) => {
    return ctx.db
      .query("earth_events")
      .withIndex("by_chapter", (q) => q.eq("chapterId", chapterId))
      .collect();
  },
});

export const createEvent = mutation({
  args: {
    chapterId: v.string(),
    title: v.string(),
    description: v.string(),
    orderIndex: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("earth_events", { ...args, createdAt: Date.now() });
  },
});

export const updateEvent = mutation({
  args: { eventId: v.string(), updates: v.any() },
  handler: async (ctx, { eventId, updates }) => {
    const events = await ctx.db.query("earth_events").collect();
    const event = events.find((e) => e._id.toString() === eventId);
    if (!event) throw new Error("Event not found");
    await ctx.db.patch(event._id, updates);
  },
});

export const removeEvent = mutation({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    const events = await ctx.db.query("earth_events").collect();
    const event = events.find((e) => e._id.toString() === eventId);
    if (!event) throw new Error("Event not found");

    const choices = await ctx.db
      .query("earth_choices")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();
    for (const choice of choices) {
      const consequences = await ctx.db
        .query("earth_consequences")
        .withIndex("by_choice", (q) => q.eq("choiceId", choice._id.toString()))
        .collect();
      for (const c of consequences) await ctx.db.delete(c._id);
      await ctx.db.delete(choice._id);
    }
    await ctx.db.delete(event._id);
  },
});

// ── Choice CRUD ──────────────────────────────────────────────────────────────
export const listChoices = query({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    return ctx.db
      .query("earth_choices")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();
  },
});

export const createChoice = mutation({
  args: {
    eventId: v.string(),
    choiceKey: v.string(),
    text: v.string(),
    orderIndex: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("earth_choices", { ...args, createdAt: Date.now() });
  },
});

export const updateChoice = mutation({
  args: { choiceId: v.string(), updates: v.any() },
  handler: async (ctx, { choiceId, updates }) => {
    const choices = await ctx.db.query("earth_choices").collect();
    const choice = choices.find((c) => c._id.toString() === choiceId);
    if (!choice) throw new Error("Choice not found");
    await ctx.db.patch(choice._id, updates);
  },
});

export const removeChoice = mutation({
  args: { choiceId: v.string() },
  handler: async (ctx, { choiceId }) => {
    const choices = await ctx.db.query("earth_choices").collect();
    const choice = choices.find((c) => c._id.toString() === choiceId);
    if (!choice) throw new Error("Choice not found");

    const consequences = await ctx.db
      .query("earth_consequences")
      .withIndex("by_choice", (q) => q.eq("choiceId", choiceId))
      .collect();
    for (const c of consequences) await ctx.db.delete(c._id);
    await ctx.db.delete(choice._id);
  },
});

// ── Consequence CRUD ─────────────────────────────────────────────────────────
export const listConsequences = query({
  args: { choiceId: v.string() },
  handler: async (ctx, { choiceId }) => {
    return ctx.db
      .query("earth_consequences")
      .withIndex("by_choice", (q) => q.eq("choiceId", choiceId))
      .collect();
  },
});

export const createConsequence = mutation({
  args: { choiceId: v.string(), consequenceData: v.any() },
  handler: async (ctx, args) => {
    return ctx.db.insert("earth_consequences", { ...args, createdAt: Date.now() });
  },
});

export const updateConsequence = mutation({
  args: { consequenceId: v.string(), consequenceData: v.any() },
  handler: async (ctx, { consequenceId, consequenceData }) => {
    const consequences = await ctx.db.query("earth_consequences").collect();
    const consequence = consequences.find((c) => c._id.toString() === consequenceId);
    if (!consequence) throw new Error("Consequence not found");
    await ctx.db.patch(consequence._id, { consequenceData });
  },
});

export const removeConsequence = mutation({
  args: { consequenceId: v.string() },
  handler: async (ctx, { consequenceId }) => {
    const consequences = await ctx.db.query("earth_consequences").collect();
    const consequence = consequences.find((c) => c._id.toString() === consequenceId);
    if (!consequence) throw new Error("Consequence not found");
    await ctx.db.delete(consequence._id);
  },
});
