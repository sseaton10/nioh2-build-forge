// =============================================================================
// Nioh 2 Build Forge — Roadmap Types
//
// These interfaces define the shape of a generated session roadmap.
// The roadmap is the natural language output that Claude generates from
// the compiler's structured data. Every field maps to a specific UI element
// in the session plan panel.
// =============================================================================

// A SessionRoadmap is the complete output of the roadmap generator.
// The UI renders each section as a distinct panel so the player can
// read exactly what they need without scrolling through irrelevant content.
export interface SessionRoadmap {
  // The 10-20 minute restartable loop — what to do right now.
  session_loop: {
    duration_minutes: number;      // estimated session length
    objective:        string;      // one sentence: what you're doing
    success_criteria: string;      // one sentence: how you know you succeeded
    steps:            string[];    // ordered action list, 3-5 items max
  };

  // The main mechanical or gear adjustment — 1-2 things to change or focus on.
  main_adjustment: {
    title:       string;
    description: string;
    why_it_matters: string;
  };

  // How to stop safely without losing progress.
  abort_cost_cap: string;

  // What to do when returning after a break — the re-entry anchor.
  reentry_anchor: string;

  // Optional context: phase notes, build identity reminder, current health score.
  context: {
    build_health:    number;
    identity_name:   string;
    phase:           string;
    health_label:    'critical' | 'developing' | 'solid' | 'optimized';
  };

  // Raw text from Claude — stored so the UI can display it as a fallback
  // if the structured parsing fails, or for the "full plan" expanded view.
  raw_response: string;

  // Metadata
  generated_at:  string;
  model_used:    string;
}

// RoadmapRequest is what the generator receives as input.
// It bundles the compiler output with session preferences so Claude
// can tailor the plan to the player's current goals.
export interface RoadmapRequest {
  compiler_output:   any;   // CompilerOutput from Task 5
  session_goal:      'boss_clear' | 'build_test' | 'farm_mats' | 'progression';
  available_minutes: number;  // how long the player has right now
  current_pain_point?: string; // optional: what's frustrating them
}
