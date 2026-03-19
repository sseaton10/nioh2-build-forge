// =============================================================================
// Nioh 2 Build Forge — Roadmap Prompt Builder
//
// This file constructs the exact text sent to the Claude API.
// The prompt is the most important engineering decision in Task 7.
//
// WHY PROMPT ENGINEERING MATTERS:
// The same Claude model produces wildly different quality outputs depending
// on how the request is structured. A vague prompt like "give me a gaming
// session plan" produces a generic response that could apply to anyone.
// A structured prompt that provides grounded data and explicit output
// requirements produces a response that is specific, accurate, and useful.
//
// THE STRATEGY HERE:
// We give Claude three things in the prompt:
//   1. ROLE — who Claude is in this context (a build advisor, not a chatbot)
//   2. DATA — the compiler's structured output as a JSON block (the facts)
//   3. FORMAT — the exact output structure we need (so parsing is reliable)
//
// Claude's job is ONLY communication — turning correct structured data
// into clear natural language. It does not need to know Nioh 2 mechanics
// beyond what we provide, because the compiler already extracted the
// relevant facts from the database.
// =============================================================================

import { RoadmapRequest } from './types';

const SESSION_GOAL_LABELS: Record<string, string> = {
  boss_clear:  'defeat a specific boss',
  build_test:  'test and calibrate build mechanics',
  farm_mats:   'farm materials or gear drops',
  progression: 'advance through story or unlock skills',
};

// buildRoadmapPrompt constructs the full prompt sent to the Claude API.
// It is a pure function — same inputs always produce the same prompt text.
// This makes it easy to test and debug without running the actual API.
export function buildRoadmapPrompt(request: RoadmapRequest): string {
  const { compiler_output, session_goal, available_minutes, current_pain_point } = request;

  // Extract the key facts from compiler output so the prompt is focused.
  // We don't send the entire compiler output blob — we send only the
  // information Claude needs to write a useful session plan.
  const topRecommendations = (compiler_output.recommendations ?? [])
    .slice(0, 3)
    .map((r: any, i: number) =>
      `${i + 1}. [${r.impact.toUpperCase()}] ${r.title} — ${r.reason}`
    )
    .join('\n');

  const topGaps = (compiler_output.stat_gaps ?? [])
    .filter((g: any) => g.status === 'below_band')
    .slice(0, 3)
    .map((g: any) =>
      `${g.display_name}: currently ${g.current_value}, target ${g.target_min}–${g.target_max} (deficit: ${g.deficit})`
    )
    .join('\n');

  const weaponInfo = compiler_output.weapon_projection
    ? `Equipped weapon: ${compiler_output.weapon_projection.display_name}
Projected attack: ${compiler_output.weapon_projection.projected_attack}
Best next investment: ${compiler_output.weapon_projection.next_point_gains?.[0]?.display_name ?? 'none'} (+${compiler_output.weapon_projection.next_point_gains?.[0]?.gain_per_point ?? 0} attack per point)`
    : 'No weapon equipped';

  const healthLabel =
    compiler_output.overall_health >= 90 ? 'optimized' :
    compiler_output.overall_health >= 70 ? 'solid' :
    compiler_output.overall_health >= 45 ? 'developing' :
    'critical';

  const painPointSection = current_pain_point
    ? `\nThe player has flagged this specific pain point: "${current_pain_point}"\nAddress this directly in your session plan if relevant.`
    : '';

  // The prompt is structured in three clear sections with XML-like delimiters.
  // This structure helps Claude parse what is data versus what is instruction.
  return `You are a build advisor for the action RPG Nioh 2. Your role is to generate a focused, ADHD-safe session plan for a player based on their current build state.

The player is playing the "${compiler_output.identity_name}" build identity in phase: ${compiler_output.phase_key}.
Their build health score is ${compiler_output.overall_health}/100 (${healthLabel}).
Their session goal is: ${SESSION_GOAL_LABELS[session_goal] ?? session_goal}.
Time available: ${available_minutes} minutes.${painPointSection}

<build_data>
BUILD HEALTH: ${compiler_output.overall_health}/100 (${healthLabel})

TOP STAT GAPS (stats below target band):
${topGaps || 'No gaps — all stats within target bands.'}

TOP RECOMMENDATIONS FROM COMPILER:
${topRecommendations || 'No recommendations available.'}

WEAPON SITUATION:
${weaponInfo}
</build_data>

Generate a session plan using EXACTLY this JSON structure. Output only valid JSON with no markdown fences, no preamble, no explanation outside the JSON:

{
  "session_loop": {
    "duration_minutes": <number matching available time>,
    "objective": "<one sentence: what the player is doing this session>",
    "success_criteria": "<one sentence: how the player knows they succeeded>",
    "steps": ["<step 1>", "<step 2>", "<step 3>"]
  },
  "main_adjustment": {
    "title": "<short label for the main thing to change or focus on>",
    "description": "<2-3 sentences explaining what to do>",
    "why_it_matters": "<1-2 sentences connecting this to the build identity>"
  },
  "abort_cost_cap": "<one sentence: how to stop safely without losing progress>",
  "reentry_anchor": "<one sentence: the first thing to do when resuming>"
}

Tone requirements: direct, grounded, no filler phrases. Assume the player has ADHD and needs one clear action at a time. Never use the words 'simply', 'just', or 'easy'. Steps should be concrete actions, not vague advice.`;
}
