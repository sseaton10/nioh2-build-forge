# Nioh 2 Build Forge

A domain-specific AI build advisor for the action RPG Nioh 2. Enter your character's current stats and equipped gear, and the application tells you exactly what is wrong with your build, what to fix first, and generates a focused session plan using the Claude API.

![Build Health Panel](docs/screenshot-analysis.png)

---

## What This Project Demonstrates

This project was built to solve a real problem: Nioh 2 has a deeply complex build system with hundreds of items, conditional stat bonuses, soft cap thresholds, and weapon scaling formulas that are opaque to players. Most build guides are static — they tell you what a good endgame build looks like but not how to get there from wherever you are right now.

The Build Forge solves this by treating the build system as a computational problem. Instead of hardcoding advice, it stores every item's effects and activation conditions as structured database rows, runs a calculation engine against the player's current character state, and produces a ranked gap analysis specific to that exact character. The AI layer (Claude) then takes the compiler's already-correct structured output and writes a natural language session plan — communication work, not game knowledge lookup.

The core technical decisions in this project each reflect a real engineering principle worth explaining.

---

## Architecture

The application is organized into four layers that each have a single, clearly defined responsibility.

**The database layer** (Supabase/PostgreSQL, Tasks 1–3) stores the game's rules and item data in a normalized relational schema. The most interesting decision here is the modifier system: rather than attaching effect values directly to item tables, every effect in the game is stored as a row in a central `modifiers` table with a polymorphic parent reference. Activation conditions live in a separate `modifier_activation_conditions` table. This data-driven design means that adding a new item with a conditional bonus requires inserting database rows — not modifying engine code.

**The calculation engine** (TypeScript, Task 4) takes a `CharacterState` object and returns an `EffectiveStats` object through a three-stage pipeline: collect all modifiers for the current loadout from the database, evaluate each modifier's conditions against the current character state, and aggregate the active modifier values by effect type. Each stage is a pure function with no side effects, which makes the engine easy to test without a database connection.

**The build compiler** (TypeScript, Task 5) sits above the engine and answers the question the engine cannot: "what should I do about my stats?" It fetches the target stat bands for the player's chosen build identity, computes an urgency-weighted gap analysis, runs a weapon damage projection using the scaling formula, and produces a ranked list of at most five concrete recommendations. The five-item cap is intentional — more recommendations activate choice paralysis.

**The React frontend** (Task 8) connects the player to the engine and compiler through four screens: a build list, a character sheet for data entry, a build analysis panel, and a Claude-generated session plan. Global state lives in a Zustand store, and every character state update automatically invalidates the previous compiler output so the player always knows whether the analysis they're looking at reflects their current stats.

---

## Key Technical Decisions

**Data-driven modifier system.** The condition evaluation engine reads operator strings and threshold values from the database (`>=`, `12`) rather than having those values hardcoded. This means adding a new conditional item never requires touching the engine. The engine evaluates every condition the same way regardless of what it is measuring.

**Separation of collection and evaluation.** The modifier collector talks to the database (async, can fail). The condition evaluator is pure math (synchronous, cannot fail). Keeping them separate means the core logic is fully testable without a database connection.

**Optimistic save pattern.** The persistence layer updates the UI immediately when saving and writes to the database in the background, making the application feel instant even on slow connections.

**Database triggers for audit trails.** The `build_snapshots` table is maintained automatically by a PostgreSQL trigger. Every time a build's character state is updated, the database inserts a new snapshot row regardless of which client or tool performed the update. The application never has to remember to create snapshot rows manually.

**AI as communicator, not advisor.** The roadmap generator sends the compiler's already-correct structured output to Claude as a JSON payload and asks Claude to write a natural language session plan. Claude's job is communication and framing — turning correct structured data into something a player can act on. The game knowledge lives in the database, not in the model.

**Graceful degradation.** Every async operation has a fallback. If the Claude API is unreachable, the roadmap generator builds a plan directly from the compiler output. If any screen crashes, error boundaries contain the damage to that screen without affecting the rest of the application or the player's saved data.

---

## Tech Stack

The database is Supabase (PostgreSQL) hosted on the free tier. The application is built with Next.js 14, React 18, TypeScript, and Zustand for global state management. The AI integration uses the Anthropic Claude API (`claude-sonnet-4-6`). All dependencies are documented in `package.json`.

---

## Getting Started

Clone the repository and install dependencies by running `npm install`. Copy the environment variable template with `cp .env.example .env.local` and fill in your Supabase URL, Supabase anon key, and Anthropic API key. Run the database migrations in order by pasting each file in `database/migrations/` into Supabase's SQL editor, followed by the seed files in `database/seeds/`. Start the development server with `npm run dev`. To run the logic tests without a database, use `npm test`.

To access the admin panel and database health checks, navigate to `http://localhost:3000/?admin=true` in your browser.

---

## Project Structure

The project is organized so that each directory has a single purpose. The `database/` directory contains migrations, seeds, and validation scripts — everything that touches Supabase. The `src/engine/` directory contains the pure calculation logic. The `src/compiler/` directory contains the gap analysis and scaling formula. The `src/persistence/` directory contains the save and load functions. The `src/roadmap/` directory contains the Claude API integration. The `src/components/` directory contains the React UI. The `src/store/` directory contains the Zustand global state.

---

## Build Identity: The Feral Ascendant

The seed data included with this project is centered around one specific build: a Strength-primary Fists brawler using Ame-no-Mitori as the Guardian Spirit, modeled after the Dragon Ball Z Super Saiyan power progression. The build has three states — medium armor base form, Lightning Talisman active, and Feral Yokai Shift — and uses the Confusion status effect (50% damage bonus from layering Lightning and Corruption elements on the same enemy) as its primary damage amplifier.

This build was chosen because it exercises every system in the application: conditional modifier evaluation (Ame-no-Mitori's Lightning Damage passive requires Courage + Magic ≥ 12), set bonus activation (Kingo's 6-piece Melee Ki Damage bonus), weapon scaling comparison (B+ Strength vs. C+ Dexterity on Fists), Ki threshold conditions (Atlas Bear Zenkai bonuses at 50% and 25% Ki), and soul core attunement budget management.

---

## License

MIT. This project is a portfolio piece and is not affiliated with Team Ninja or Koei Tecmo.
