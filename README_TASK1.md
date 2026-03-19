# Nioh 2 Build Forge v1
## Task 1 Deliverable — Seed-Rule Schema Foundation

---

### What this task produced

Task 1 establishes the six base lookup tables that every subsequent migration
and the entire calculation engine depend on. Nothing else in the application
can be built until these tables exist and are correctly seeded.

**Tables created:**
- `rarity_slot_rules` — Maps rarity tiers to extra special effect slot counts
- `item_types` — All equippable item categories with slot family assignments
- `phases` — Four game progression phases used for item gating and roadmap
- `stats` — All eight base character stats with derived effect flags
- `stat_soft_cap_rules` — Piecewise soft cap curves for Courage, Heart, Constitution, Stamina
- `scaling_grades` — Grade-to-coefficient mapping for weapon damage calculation (D through S)

---

### Files produced

```
database/
├── migrations/
│   └── 001_seed_rule_schema_foundation.sql   ← Run first: creates all tables
├── seeds/
│   ├── 001_base_lookup_data.sql              ← Run second: inserts all seed rows
│   └── types/
│       └── seed-tables.ts                    ← TypeScript interfaces for all tables
└── validation/
    └── 001_task1_acceptance_check.sql        ← Run third: validates acceptance criteria
```

---

### How to run

#### Step 1: Create your Supabase project
1. Go to https://supabase.com and create a free account
2. Create a new project (free tier is sufficient)
3. Wait for the project to provision (~2 minutes)
4. Go to Project Settings → Database → Connection string and copy it

#### Step 2: Run the migration
In the Supabase dashboard:
1. Go to SQL Editor
2. Paste the contents of `001_seed_rule_schema_foundation.sql`
3. Run it — you should see `CREATE TABLE` success messages for all 6 tables

#### Step 3: Run the seed
In the SQL Editor:
1. Paste the contents of `001_base_lookup_data.sql`
2. Run it — you should see `INSERT 5`, `INSERT 17`, `INSERT 4`, etc.

#### Step 4: Validate
In the SQL Editor:
1. Paste the contents of `001_task1_acceptance_check.sql`
2. Run the SUMMARY check at the bottom
3. All six rows should show `PASS`

---

### Acceptance criteria

| Table | Expected rows | Check |
|---|---|---|
| rarity_slot_rules | 5 | ✓ |
| item_types | 17 | ✓ |
| phases | 4 | ✓ |
| stats | 8 | ✓ |
| scaling_grades | 12 | ✓ |
| stat_soft_cap_rules | 5 | ✓ |

All six tables present + row counts match = Task 1 complete.

---

### Data confidence notes

| Table | Confidence | Notes |
|---|---|---|
| rarity_slot_rules | High | Slot counts community-verified |
| item_types | High | All 10 weapon types + armor + accessories verified |
| phases | High | Four-phase structure is canonical |
| stats | High | All eight stats verified from game |
| stat_soft_cap_rules | High | Breakpoints verified; delta values community-approximated |
| scaling_grades | Mixed | B+, C+, C, D+ are verified anchors. All others are APPROXIMATED and flagged |

**Approximated scaling grade coefficients must be verified against community
damage testing before the weapon damage formula produces trustworthy output.
The `approximation_flag = true` column identifies all unverified grades.**

---

### What Task 2 builds on top of this

Task 2 (Static game data schema) creates:
- `weapons` + `weapon_scaling_stats`
- `armor`
- `sets` + `set_bonus_requirements`
- `soul_cores`
- `guardian_spirits` + `spirit_passives`

All of these reference the tables created in Task 1 via foreign keys.
Task 1 must be complete and passing validation before Task 2 begins.

---

### TypeScript usage

```typescript
import {
  RaritySlotRule,
  ScalingGrade,
  StatSoftCapRule,
  StatKey,
  PhaseKey,
  ScalingGradeKey,
  upgradeGrade,
  calculateWeightCapacity,
  computeSoftCappedValue,
  GRADE_LADDER,
  ALL_STAT_KEYS,
} from './database/seeds/types/seed-tables';

// Example: get weight capacity at Stamina 10
const capacity = calculateWeightCapacity(10);
// Returns: 30.9 + (10 - 5) * 0.9 = 35.4 units

// Example: upgrade a B+ grade at max Familiarity
const upgraded = upgradeGrade('B+');
// Returns: 'A-'

// Example: compute Life from Constitution 12
// Rules from seed: +25/point until 10, then +15/point
// computeSoftCappedValue(12, constitutionLifeRules, BASE_LIFE)
```
