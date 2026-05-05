import { z } from 'zod'

export const ActionConsequenceSchema = z
  .object({
    health: z.number().int().optional(),
    energy: z.number().int().optional(),
    experience: z.number().int().optional(),
    credits: z.number().int().optional(),
    earth: z.number().int().optional(),
    item: z.string().min(1).optional(),
    story_flag: z.string().min(1).optional(),
    response_text: z.string().min(1).optional(),
    next_event_id: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
  })
  .strict()

export const StoryEntitySchema = z.enum([
  'story',
  'chapter',
  'event',
  'choice',
  'consequence',
])

export const StoryCreateSchemas = {
  story: z
    .object({
      title: z.string().min(1),
      description: z.string().optional().nullable(),
      character_path: z.string().min(1),
      location_ids: z.array(z.string()).optional(),
      min_level: z.number().int().optional(),
      max_level: z.number().int().optional().nullable(),
      first_event_id: z.string().uuid().optional().nullable(),
      is_active: z.boolean().optional(),
      is_deleted: z.boolean().optional(),
      display_order: z.number().int().optional(),
      required_flags: z.array(z.string()).optional(),
      deleted_at: z.string().datetime().optional().nullable(),
    })
    .strict(),
  chapter: z
    .object({
      story_id: z.string().uuid(),
      chapter_number: z.number().int(),
      title: z.string().min(1),
      description: z.string().optional().nullable(),
      min_level: z.number().int().optional(),
    })
    .strict(),
  event: z
    .object({
      chapter_id: z.string().uuid(),
      title: z.string().min(1),
      description: z.string().optional().nullable(),
      order_index: z.number().int(),
      required_location_id: z.string().optional().nullable(),
      required_items: z.array(z.string()).optional(),
      required_flags: z.array(z.string()).optional(),
    })
    .strict(),
  choice: z
    .object({
      event_id: z.string().uuid(),
      choice_key: z.string().min(1),
      text: z.string().min(1),
      order_index: z.number().int(),
    })
    .strict(),
  consequence: z
    .object({
      choice_id: z.string().uuid(),
      consequence_data: ActionConsequenceSchema,
    })
    .strict(),
}

export const StoryUpdateSchemas = {
  story: StoryCreateSchemas.story.partial().strict(),
  chapter: StoryCreateSchemas.chapter.partial().strict(),
  event: StoryCreateSchemas.event.partial().strict(),
  choice: StoryCreateSchemas.choice.partial().strict(),
  consequence: z
    .object({
      consequence_data: ActionConsequenceSchema,
    })
    .strict(),
}

export const StoryCreateRequestSchema = z
  .object({
    entity: StoryEntitySchema,
    data: z.record(z.unknown()),
  })
  .strict()

export const StoryUpdateRequestSchema = z
  .object({
    entity: StoryEntitySchema,
    id: z.string().uuid(),
    updates: z.record(z.unknown()),
  })
  .strict()

export const StoryDeleteRequestSchema = z
  .object({
    entity: StoryEntitySchema,
    id: z.string().uuid(),
  })
  .strict()

export type StoryEntity = z.infer<typeof StoryEntitySchema>
export type ActionConsequence = z.infer<typeof ActionConsequenceSchema>
