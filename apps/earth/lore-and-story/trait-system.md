# Trait System - Story Flag Integration

## Core Traits

### Leadership
- **Description**: Ability to inspire and guide others
- **Gameplay Effects**: Access to leadership dialogue options, can rally NPCs, better group coordination
- **Story Flags Contributing**: `hero_instinct` (+3), `volunteer_spirit` (+2), `dutiful_citizen` (+1), `peaceful_contact` (+1)

### Rebellion
- **Description**: Willingness to challenge authority and status quo
- **Gameplay Effects**: Unlock resistance storylines, access to underground networks, stealth bonuses
- **Story Flags Contributing**: `curious_rebel` (+3), `consor_hacked` (+2), `questioning_mind` (+2), `truth_seeker` (+1)

### Survival
- **Description**: Ability to endure and thrive in harsh conditions
- **Gameplay Effects**: Better resource management, environmental resistance, solo operation bonuses
- **Story Flags Contributing**: `self_preservation` (+3), `lone_wolf` (+2), `paranoid_survivor` (+2), `self_reliant` (+1)

### Diplomacy
- **Description**: Skill in negotiation and peaceful resolution
- **Gameplay Effects**: Better trade prices, peaceful conflict resolution, NPC trust bonuses
- **Story Flags Contributing**: `peaceful_contact` (+3), `direct_approach` (+2), `business_first` (+1), `dutiful_citizen` (+1)

### Tech Savvy
- **Description**: Understanding and manipulation of technology
- **Gameplay Effects**: Hacking bonuses, tech crafting, access to advanced systems
- **Story Flags Contributing**: `consor_hacked` (+3), `questioning_mind` (+1), `self_reliant` (+1), `careful_observer` (+1)

### Empathy
- **Description**: Understanding and connecting with others emotionally
- **Gameplay Effects**: Better NPC relationships, access to emotional storylines, healing bonuses
- **Story Flags Contributing**: `hero_instinct` (+2), `volunteer_spirit` (+3), `truth_seeker` (+1), `direct_approach` (+1)

## Trait Scoring System

### Score Ranges
- **0-5**: Minimal - Basic interactions only
- **6-10**: Developing - Some specialized options unlock
- **11-15**: Competent - Full access to trait-based storylines
- **16-20**: Expert - Unique master-level options
- **21+**: Legendary - Exclusive endgame possibilities

### Chapter 1 Trait Progression Examples

| Choice Path | Leadership | Rebellion | Survival | Diplomacy | Tech Savvy | Empathy |
|-------------|------------|-----------|----------|-----------|------------|---------|
| Male: Trade → Signal → Rescue | 6 | 0 | 0 | 4 | 0 | 5 |
| Male: Scavenge → Hack → Negotiate | 0 | 2 | 2 | 1 | 3 | 0 |
| Male: Avoid → Hide → Ignore | 0 | 0 | 7 | 0 | 0 | 0 |
| Female: Report → Security → Volunteer | 8 | 0 | 0 | 2 | 0 | 2 |
| Female: Treat → Confront → Question | 1 | 3 | 1 | 2 | 1 | 1 |
| Female: Observe → Investigate → Silent | 0 | 5 | 0 | 0 | 2 | 0 |

## Trait Interactions

### Synergies
- **Leadership + Empathy**: Unlock "Inspiring Leader" storylines
- **Rebellion + Tech Savvy**: Access to "Digital Resistance" networks
- **Survival + Diplomacy**: "Wasteland Negotiator" reputation
- **Leadership + Diplomacy**: "Peacemaker" faction options

### Conflicts
- **High Rebellion + High Diplomacy**: Creates "Conflicted Idealist" storylines
- **High Survival + High Empathy**: "Reluctant Savior" character arc
- **High Leadership + High Rebellion**: "Revolutionary Leader" path

## Gameplay Integration

### Trait Checks
```javascript
// Example trait check system
function canAccessStoryline(character, requiredTraits) {
  return requiredTraits.every(req => 
    character.traits[req.trait] >= req.minScore
  );
}

// Usage example
const canLeadCaravan = canAccessStoryline(character, [
  { trait: 'Leadership', minScore: 8 },
  { trait: 'Survival', minScore: 5 }
]);
```

### Dynamic Dialogue
- **Leadership 8+**: "I can get us through this together."
- **Rebellion 8+**: "We don't have to accept their rules."
- **Survival 8+**: "I've survived worse than this."
- **Diplomacy 8+**: "Let's find a solution that works for everyone."

### Trait-Based Abilities
- **Leadership**: Rally allies (+20% group effectiveness)
- **Rebellion**: Resist authority (+15% to escape/stealth)
- **Survival**: Endure hardship (+25% resource efficiency)
- **Diplomacy**: Peaceful resolution (+30% success in negotiations)
- **Tech Savvy**: System manipulation (+40% hacking success)
- **Empathy**: Emotional connection (+20% NPC trust gain)

## Future Chapter Integration

### Chapter 10-11 (Signal Event)
- **Tech Savvy 10+**: Decode signal origins
- **Rebellion 8+**: Recognize resistance patterns
- **Leadership 8+**: Organize group response

### Chapter 17-18 (Character Crossover)
- **Empathy 12+ OR Diplomacy 10+**: Enable peaceful first contact
- **Leadership 15+ AND Empathy 10+**: Inspire cooperation
- **Rebellion 12+ AND Survival 10+**: Form underground alliance

### Chapter 30-31 (Final Choice)
- **Leadership 20+**: Unite all factions
- **Rebellion 20+**: Overthrow the system
- **Survival 20+**: Ensure species survival
- **Diplomacy 20+**: Negotiate lasting peace

## Database Schema

```sql
CREATE TABLE character_traits (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    trait_name VARCHAR(20) NOT NULL,
    score INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trait_modifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    story_flag VARCHAR(50) NOT NULL,
    trait_name VARCHAR(20) NOT NULL,
    score_change INTEGER NOT NULL,
    chapter INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Balancing Considerations

### Max Trait Distribution
- Single playthrough cannot max all traits
- Choices create meaningful trade-offs
- Multiple playthroughs encourage different builds
- Balanced builds vs. specialized builds both viable

### Trait Decay
- Some traits may decrease based on contrary actions
- Long-term choices can reshape character personality
- Redemption arcs possible through consistent new choices