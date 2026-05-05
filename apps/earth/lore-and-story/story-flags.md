# Story Flags - Chapter 1

## Male Path: "The Scavenger's Choice"

| Story Flag | Triggering Choice | Possible Effects |
|------------|------------------|------------------|
| `peaceful_contact` | Approach settlement cautiously for trade | Better reputation with settlements, access to trader networks, peaceful resolution options in future conflicts |
| `lone_wolf` | Scout settlement from distance | Self-reliance bonuses, stealth advantages, distrust from communities, harder to form alliances |
| `paranoid_survivor` | Avoid settlement entirely | Survival bonuses in dangerous situations, social interaction penalties, miss opportunities for cooperation |
| `consor_avoided` | Hide from Consor patrol | Maintains anonymity, avoids Consor attention, may miss valuable intel or opportunities |
| `consor_contact` | Signal Consor patrol for work | Opens Consor job opportunities, may lead to surveillance, access to better tech/weapons |
| `consor_hacked` | Hack Consor communication | Gains valuable intelligence, becomes target for Consor retaliation, unlocks hacker storylines |
| `hero_instinct` | Immediately respond to rescue signal | Reputation boost with survivors, access to heroic storylines, attracts both allies and enemies |
| `business_first` | Negotiate payment before rescue | Mercenary reputation, better payment terms, pragmatic dialogue options |
| `self_preservation` | Ignore rescue signal | Survival-focused character development, guilt/regret storylines, missed rescue network connections |

## Female Path: "The Garden's Shadow"

| Story Flag | Triggering Choice | Possible Effects |
|------------|------------------|------------------|
| `dutiful_citizen` | Report blight to Council immediately | Council trust increases, access to official channels, may be kept in the dark about secrets |
| `self_reliant` | Treat garden blight yourself | Botanical knowledge growth, independence storylines, may discover things Council wanted hidden |
| `questioning_mind` | Observe blight secretly | Uncovers hidden truths, investigative storylines, potential Council suspicion |
| `security_loyal` | Turn stranger's note to security | High security clearance, access to dome's inner workings, may become tool of oppression |
| `direct_approach` | Confront stranger about message | Honest communication reputation, gets straight answers, may put informants at risk |
| `curious_rebel` | Investigate coordinates secretly | Rebellion storylines, discovers outside world, puts dome citizenship at risk |
| `volunteer_spirit` | Volunteer for outside mission | Heroic reputation, chosen for dangerous missions, accelerated character growth |
| `truth_seeker` | Ask Council about their secrets | Gains partial information, marked as potential troublemaker, unlocks conspiracy storylines |
| `careful_observer` | Pretend to hear nothing | Maintains cover, accumulates secrets, may be underestimated by enemies |

## Cross-Path Implications

### Reputation Systems
- **Settlement Trust**: Affected by `peaceful_contact`, `hero_instinct`, `dutiful_citizen`
- **Consor Standing**: Influenced by `consor_contact`, `consor_hacked`, `consor_avoided`
- **Survivor Network**: Built through `hero_instinct`, `volunteer_spirit`, `truth_seeker`

### Character Development Paths
- **Leadership Track**: `hero_instinct` + `volunteer_spirit` + `dutiful_citizen`
- **Rebel Track**: `curious_rebel` + `consor_hacked` + `questioning_mind`
- **Survivor Track**: `self_preservation` + `lone_wolf` + `paranoid_survivor`
- **Diplomat Track**: `peaceful_contact` + `direct_approach` + `business_first`

### Future Chapter Prerequisites
- **Chapter 10-11 Signal Event**: Characters with `consor_hacked` or `truth_seeker` get different signal interpretations
- **Chapter 17-18 Crossover**: Only characters with complementary flags (`hero_instinct` + `volunteer_spirit`, `peaceful_contact` + `direct_approach`) can meet
- **Chapter 20-21 Convergence**: Characters with `questioning_mind` or `curious_rebel` get early warnings
- **Chapter 30-31 Final Choice**: Available options depend on accumulated reputation and story flag combinations

## Technical Implementation Notes

### Database Schema
```sql
CREATE TABLE story_flags (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    flag_name VARCHAR(50) NOT NULL,
    chapter_acquired INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Flag Interaction Rules
- Some flags are mutually exclusive within the same chapter
- Flags can be modified or removed by later choices
- Multiple flags can combine for unique story outcomes
- Flag combinations unlock special dialogue options and story branches