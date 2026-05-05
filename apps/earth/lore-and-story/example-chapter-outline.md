# Example Chapter: "The Mysterious Cave"
## Feature-Complete Story Flow Demonstration

This chapter demonstrates ALL story system features:
- Text-only events
- Choice events
- Event chaining (next_event_id)
- Consequences (health, energy, experience, credits)
- Story flags
- Multiple paths that converge
- Proper endings (no infinite loops)

---

## Chapter Structure

**Chapter Number:** 99
**Title:** "The Mysterious Cave"
**Description:** "A tutorial chapter demonstrating all story features"

---

## Event Flow Diagram

```
START
  ↓
[1] Discovery (TEXT ONLY)
  ↓
[2] Cave Entrance (CHOICE)
  ├─ "Enter Carefully" → [3] Safe Path
  └─ "Rush In" → [4] Dangerous Path
      ↓                    ↓
[3] Safe Path          [4] Dangerous Path
  (CHOICE)               (CHOICE)
  ├─ "Search"            ├─ "Fight" → [6] Victory
  └─ "Continue"          └─ "Flee" → [5] Treasure Room
      ↓                        ↓
[5] Treasure Room       [6] Victory
  (CHOICE)               (TEXT ONLY)
  ├─ "Take All"              ↓
  └─ "Take Some"        [7] Cave Exit
      ↓                   (TEXT ONLY)
[7] Cave Exit               ↓
  (TEXT ONLY)             END
      ↓
    END
```

---

## Events Detail

### Event 1: "Discovery" (TEXT ONLY)
**Type:** text_event
**Order Index:** 1
**Description:**
```
You stumble upon a dark cave entrance hidden behind thick vines.
Strange blue light emanates from within, and you hear the faint
sound of dripping water echoing from deep inside.
```

**No Choices** - Automatically proceeds to Event 2

---

### Event 2: "Cave Entrance" (CHOICE)
**Type:** choice_event
**Order Index:** 2
**Description:**
```
You stand at the mouth of the cave. The blue light pulses
rhythmically, almost like a heartbeat. Do you proceed with
caution, or dive right in?
```

**Choices:**

**Choice 1:** "Enter Carefully"
- **Order Index:** 1
- **Consequence:**
  - `response_text`: "You carefully step into the cave, your eyes adjusting to the dim light."
  - `next_event_id`: [Event 3: Safe Path]
  - `story_flag`: "entered_carefully"

**Choice 2:** "Rush In"
- **Order Index:** 2
- **Consequence:**
  - `response_text`: "You rush into the cave and immediately trip on a loose rock! You take damage but find yourself in a different part of the cave."
  - `next_event_id`: [Event 4: Dangerous Path]
  - `health`: -10
  - `story_flag`: "rushed_in"

---

### Event 3: "Safe Path" (CHOICE)
**Type:** choice_event
**Order Index:** 3
**Description:**
```
The cave tunnel splits into two paths. The left path is well-worn
and seems safer. You notice ancient markings on the wall that might
provide clues if you search them.
```

**Choices:**

**Choice 1:** "Search the Markings"
- **Order Index:** 1
- **Consequence:**
  - `response_text`: "The ancient symbols reveal a map to a hidden treasure room! You gain wisdom from the discovery."
  - `next_event_id`: [Event 5: Treasure Room]
  - `experience`: 50
  - `energy`: -5
  - `story_flag`: "found_ancient_map"

**Choice 2:** "Continue Forward"
- **Order Index:** 2
- **Consequence:**
  - `response_text`: "You press on through the safe path, eventually finding the exit on the other side."
  - `next_event_id`: [Event 7: Cave Exit]
  - `energy`: -3

---

### Event 4: "Dangerous Path" (CHOICE)
**Type:** choice_event
**Order Index:** 4
**Description:**
```
You find yourself face-to-face with a Cave Guardian - a massive
crystalline creature blocking the path. Its eyes glow with the same
blue light that fills the cave.
```

**Choices:**

**Choice 1:** "Fight the Guardian"
- **Order Index:** 1
- **Consequence:**
  - `response_text`: "You engage in battle with the Guardian! After a fierce fight, you emerge victorious but wounded."
  - `next_event_id`: [Event 6: Victory]
  - `health`: -20
  - `energy`: -15
  - `experience`: 100
  - `credits`: 50
  - `story_flag`: "defeated_guardian"

**Choice 2:** "Flee Past It"
- **Order Index:** 2
- **Consequence:**
  - `response_text`: "You dodge around the Guardian and sprint deeper into the cave, discovering a hidden chamber!"
  - `next_event_id`: [Event 5: Treasure Room]
  - `energy`: -10
  - `story_flag`: "fled_from_guardian"

---

### Event 5: "Treasure Room" (CHOICE)
**Type:** choice_event
**Order Index:** 5
**Description:**
```
You've found a hidden treasure room! Ancient coins and artifacts
are scattered across stone pedestals. However, you notice a warning
inscription: "Take only what you need, for greed awakens the curse."
```

**Choices:**

**Choice 1:** "Take All the Treasure"
- **Order Index:** 1
- **Consequence:**
  - `response_text`: "You greedily grab everything! The curse activates, draining your health but you're rich now."
  - `next_event_id`: [Event 7: Cave Exit]
  - `health`: -30
  - `credits`: 500
  - `story_flag`: "cursed_by_greed"

**Choice 2:** "Take Only Some Treasure"
- **Order Index:** 2
- **Consequence:**
  - `response_text`: "You take a modest amount of treasure. The room glows warmly, blessing you with energy!"
  - `next_event_id`: [Event 7: Cave Exit]
  - `credits`: 150
  - `energy`: +20
  - `story_flag`: "blessed_by_moderation"

---

### Event 6: "Victory" (TEXT ONLY)
**Type:** text_event
**Order Index:** 6
**Description:**
```
The Guardian crumbles into shimmering dust, revealing a path forward.
You find a small pouch of coins among the remains - a reward for
your bravery.
```

**No Choices** - Automatically proceeds to Event 7

---

### Event 7: "Cave Exit" (TEXT ONLY)
**Type:** text_event
**Order Index:** 7
**Description:**
```
You emerge from the cave into bright sunlight, your adventure complete.
The experience has made you stronger and wiser.

[END OF CHAPTER]
```

**No Choices** - Chapter ends here

---

## Feature Checklist

✅ **Text-Only Events** - Events 1, 6, 7
✅ **Choice Events** - Events 2, 3, 4, 5
✅ **Event Chaining** - Every choice flows to next event via `next_event_id`
✅ **Health Changes** - Event 2 (-10), Event 4 (-20), Event 5 (-30)
✅ **Energy Changes** - Events 2, 3, 4, 5 (both + and -)
✅ **Experience Rewards** - Events 3 (+50), Event 4 (+100)
✅ **Credits/Currency** - Events 4 (+50), Event 5 (+150 or +500)
✅ **Story Flags** - Every choice sets a unique flag
✅ **Multiple Paths** - 5 different ways to complete the chapter
✅ **Path Convergence** - Different paths lead to same events (5→7, 3→7)
✅ **Proper Endings** - All paths end at Event 7, no loops
✅ **Response Text** - Every choice gives immediate feedback

---

## Paths Through Chapter

**Path 1: Cautious Explorer**
1 → 2 (Careful) → 3 (Search) → 5 (Take Some) → 7
- Flags: `entered_carefully`, `found_ancient_map`, `blessed_by_moderation`
- Net: +50 XP, +20 energy, -5 energy, +150 credits

**Path 2: Quick Exit**
1 → 2 (Careful) → 3 (Continue) → 7
- Flags: `entered_carefully`
- Net: -3 energy

**Path 3: Brave Warrior**
1 → 2 (Rush) → 4 (Fight) → 6 → 7
- Flags: `rushed_in`, `defeated_guardian`
- Net: -10 health, -20 health, +100 XP, -15 energy, +50 credits

**Path 4: Clever Thief**
1 → 2 (Rush) → 4 (Flee) → 5 (Take Some) → 7
- Flags: `rushed_in`, `fled_from_guardian`, `blessed_by_moderation`
- Net: -10 health, -10 energy, +20 energy, +150 credits

**Path 5: Greedy Fool**
1 → 2 (Rush) → 4 (Flee) → 5 (Take All) → 7
- Flags: `rushed_in`, `fled_from_guardian`, `cursed_by_greed`
- Net: -10 health, -10 energy, -30 health, +500 credits

---

## Implementation Notes

**Event Order:**
- Use `order_index` to control display order in chapter list (1-7)
- This doesn't control story flow - `next_event_id` does that

**Event Types:**
- `text_event`: No choices, auto-advances (like cutscenes)
- `choice_event`: Player makes a decision

**Consequences:**
- Always include `response_text` for player feedback
- Use `next_event_id` to chain events together
- Set `story_flag` to track player decisions (for later requirements)
- Modify stats (health, energy, experience, credits) as needed

**Avoiding Infinite Loops:**
- Every path must eventually reach Event 7 (the ending)
- Never create circular references (A → B → A)
- Text-only events should auto-advance to next event or end

**Testing:**
- Test each individual event first
- Then test the full chapter to see all paths work
- Verify all choices lead somewhere
- Check that story ends properly

---

This chapter demonstrates proper story construction with meaningful choices,
consequences, and multiple valid paths to completion!
