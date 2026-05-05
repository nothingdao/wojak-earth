# Story Editor - Complete Workflow Guide

## ✅ New Simplified Workflow

The Story Editor now has a **clear, consistent editing interface** with proper editor panels.

### How to Edit Content

#### 1. **Select a Story**
- Click on a story button (e.g., "Main (male)")
- The **Story Details Panel** appears below showing:
  - Title, Description, Character Path
  - **Locations** (multi-select with search)
  - Min/Max Level, Required Flags
  - First Event, Active status, Display Order

#### 2. **Select a Chapter**
- Click on a chapter in the list (e.g., "Ch. 1: The Beginning")
- The **Chapter Details Panel** appears showing:
  - **Chapter Number** (editable!)
  - **Title**
  - **Description**
- Click "Save Chapter" to save changes
- Click "Test" to test the whole chapter

#### 3. **Select an Event**
- Click on an event (e.g., "What is next?")
- The **Event Details Panel** appears showing ALL fields:
  - **Title**
  - **Description / Dialog** (what the player sees)
  - **Event Key** (optional, legacy identifier like "m1_e1")
  - **Order Index** (display order in chapter)
  - **Event Type** (Choice Event, Text Only, Battle Event)
- Click "Save Event" to save changes
- Click "Test" to test just this event

#### 4. **Manage Choices & Consequences**
- With an event selected, the right panel shows choices
- Each choice shows:
  - Choice text
  - Choice number
  - Consequence count
- **Edit Choice**: Click the edit button → prompts for new text
- **Delete Choice**: Click trash icon (deletes choice + all consequences)
- **Add Consequence**: Click "+" → Opens full consequence builder modal
- **Edit Consequence**: Click edit icon → Opens builder with existing data

### Testing Stories

**Test Single Event:**
- Select an event → Click "Test" button
- Shows just that event with its choices

**Test Full Chapter:**
- Select a chapter → Click "Test" button
- Now properly loads ALL events with their choices/consequences!
- Plays through the entire chapter sequence

## Database Fields Reference

### Story
```javascript
{
  title: "Story title"
  description: "Story description"
  character_path: "male" | "female" | "both"
  location_ids: ["location1", "location2"] // Array! Can be multiple
  min_level: 1
  max_level: 10 // or null
  first_event_id: "uuid-of-first-event"
  is_active: true
  display_order: 0
  required_flags: ["flag1", "flag2"]
}
```

### Chapter
```javascript
{
  chapter_number: 1      // Now editable!
  title: "Chapter title"
  description: "Chapter description"
}
```

### Event
```javascript
{
  title: "Event title"
  description: "What the player sees..."  // Main dialog
  event_key: "m1_e1"     // Optional legacy ID
  event_type: "choice_event" | "text_event" | "battle_event"
  order_index: 1         // Display order in chapter
}
```

### Choice
```javascript
{
  text: "Go outside"
  choice_key: "c1"       // Optional identifier
  order_index: 1
}
```

### Consequence (in consequence_data JSONB)
```javascript
{
  // Story Flow
  response_text: "You step outside into the sunlight..."
  next_event_id: "uuid-of-next-event"

  // Game Effects
  health: -1,
  energy: 5,
  experience: 10,
  credits: 50,
  item: "artifact_key",
  story_flag: "went_outside",

  // Custom fields (any JSON)
  custom_field: "custom_value"
}
```

## Fixed Issues

✅ **Chapter Test** now loads all choices/consequences properly
✅ **All fields** are now visible and editable
✅ **Consistent UI** - no more confusing inline editing
✅ **Clear panels** - you always know what you're editing
✅ **Multi-location support** - stories can be at multiple locations

## Workflow Example

```
1. Select "Main (male)" story
   → Story panel appears, set locations to ["solana-beach", "crystal-caves"]
   → Set min_level to 1, Save

2. Select "Chapter 1: The Beginning"
   → Chapter panel appears, edit description, Save

3. Select "What is next?" event
   → Event panel appears
   → Edit description: "Now that you feel better, you might want to go outside."
   → Set event_type to "choice_event"
   → Save Event

4. In the Choices panel on the right:
   → Click "Add Choice" → Enter "Go outside"
   → Click "+" to add consequence
   → Set response_text: "You step into the warm sunlight..."
   → Set experience: 5
   → Save Consequence

5. Test the chapter:
   → Click "Test" on Chapter 1
   → See the full story flow with all choices working!
```

All content is now easy to find, edit, and test!
