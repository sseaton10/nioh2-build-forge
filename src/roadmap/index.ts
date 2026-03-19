// =============================================================================
// Nioh 2 Build Forge — Roadmap Generator (Main Entry Point)
//
// This file calls the Claude API and processes the response into a
// structured SessionRoadmap object. It handles the three things that
// can go wrong with any AI API call: network errors, malformed responses,
// and responses that don't match the expected format.
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';
import { buildRoadmapPrompt } from './prompt-builder';
import { RoadmapRequest, SessionRoadmap } from './types';

// The Anthropic client reads the API key from the environment.
// Never hardcode API keys — they belong in environment variables only.
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// MODEL CHOICE: claude-sonnet-4-6 is the right balance of quality and speed
// for this use case. Opus would be overkill for a structured JSON generation
// task. Haiku would be too terse for the nuanced tone requirements.
const MODEL = 'claude-sonnet-4-6';

// -----------------------------------------------------------------------------
// generateRoadmap
// The main entry point. Takes a RoadmapRequest and returns a SessionRoadmap.
// The function never throws — it returns a fallback roadmap on any error
// so the UI always has something to show, even if the API call fails.
// -----------------------------------------------------------------------------
export async function generateRoadmap(
  request: RoadmapRequest
): Promise<SessionRoadmap> {
  const prompt = buildRoadmapPrompt(request);
  const generatedAt = new Date().toISOString();

  try {
    const response = await anthropic.messages.create({
      model:      MODEL,
      max_tokens: 1024,
      messages: [
        { role: 'user', content: prompt }
      ],
    });

    // Extract the text content from the response.
    // Claude's response is an array of content blocks — we want the first text block.
    const rawText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('');

    // Parse the JSON response into a structured object.
    const parsed = parseRoadmapResponse(rawText);

    return {
      ...parsed,
      context: {
        build_health:  request.compiler_output.overall_health ?? 0,
        identity_name: request.compiler_output.identity_name ?? 'Unknown',
        phase:         request.compiler_output.phase_key ?? 'early_game',
        health_label:  getHealthLabel(request.compiler_output.overall_health ?? 0),
      },
      raw_response: rawText,
      generated_at: generatedAt,
      model_used:   MODEL,
    };

  } catch (error) {
    console.error('Roadmap generation failed:', error);
    // Return a safe fallback so the UI doesn't break.
    return buildFallbackRoadmap(request, generatedAt);
  }
}

// -----------------------------------------------------------------------------
// parseRoadmapResponse
// Parses Claude's JSON response into a partial SessionRoadmap.
// Uses try/catch rather than assuming the JSON is always valid —
// even with a well-structured prompt, models occasionally produce
// slightly malformed JSON that needs graceful handling.
// -----------------------------------------------------------------------------
function parseRoadmapResponse(rawText: string): Partial<SessionRoadmap> {
  try {
    // Strip any accidental markdown fences if present.
    // Despite the prompt saying not to include them, models sometimes do.
    const cleaned = rawText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      session_loop:    parsed.session_loop,
      main_adjustment: parsed.main_adjustment,
      abort_cost_cap:  parsed.abort_cost_cap,
      reentry_anchor:  parsed.reentry_anchor,
    };
  } catch (parseError) {
    console.warn('JSON parse failed, using raw text fallback:', parseError);
    // If parsing fails, extract what we can from the raw text
    // by using simple heuristics rather than crashing.
    return {
      session_loop: {
        duration_minutes: 20,
        objective:        'Review your build state and identify your next action.',
        success_criteria: 'You have a clear next step when you close the app.',
        steps:            ['Review the stat gaps panel', 'Identify your highest urgency stat', 'Spend your available level-up points'],
      },
      main_adjustment: {
        title:           'Review compiler recommendations',
        description:     rawText.slice(0, 200),
        why_it_matters:  'Staying aligned with your build identity maximizes efficiency.',
      },
      abort_cost_cap:  'You can stop at any shrine without losing progress.',
      reentry_anchor:  'Open the Build Forge and check your current stat gaps.',
    };
  }
}

// -----------------------------------------------------------------------------
// buildFallbackRoadmap
// Returns a safe, generic roadmap when the API call fails entirely.
// This ensures the UI always renders something useful rather than an error.
// The fallback reads from the compiler output directly to stay accurate
// even without Claude's natural language generation.
// -----------------------------------------------------------------------------
function buildFallbackRoadmap(
  request: RoadmapRequest,
  generatedAt: string
): SessionRoadmap {
  const topRec = request.compiler_output.recommendations?.[0];
  const topGap = request.compiler_output.stat_gaps?.find((g: any) => g.status === 'below_band');

  return {
    session_loop: {
      duration_minutes: request.available_minutes,
      objective: topRec
        ? `Focus on: ${topRec.title}`
        : 'Work toward your next build milestone.',
      success_criteria: topGap
        ? `Invest ${topGap.deficit} point${topGap.deficit > 1 ? 's' : ''} in ${topGap.display_name}.`
        : 'Make progress on your highest-priority stat gap.',
      steps: [
        'Open your character menu and check available level-up points.',
        topGap ? `Invest points in ${topGap.display_name} until you reach ${topGap.target_min}.` : 'Review your stat gaps and invest in your highest-priority stat.',
        'Run a mission that matches your current level range.',
      ],
    },
    main_adjustment: {
      title:          topRec?.title ?? 'Address your primary stat gap',
      description:    topRec?.reason ?? 'Your compiler has identified gaps between your current stats and your build identity targets.',
      why_it_matters: 'Closing stat gaps keeps your build on the optimal progression path for your chosen identity.',
    },
    abort_cost_cap:  'Rest at any shrine to save progress. Level-up investments are permanent and do not require additional saves.',
    reentry_anchor:  'Check your overall build health score and find the highest-urgency stat gap in the list.',
    context: {
      build_health:  request.compiler_output.overall_health ?? 0,
      identity_name: request.compiler_output.identity_name ?? 'Unknown',
      phase:         request.compiler_output.phase_key ?? 'early_game',
      health_label:  getHealthLabel(request.compiler_output.overall_health ?? 0),
    },
    raw_response:  'API call failed — showing fallback plan generated from compiler data.',
    generated_at:  generatedAt,
    model_used:    'fallback',
  };
}

function getHealthLabel(health: number): 'critical' | 'developing' | 'solid' | 'optimized' {
  if (health >= 90) return 'optimized';
  if (health >= 70) return 'solid';
  if (health >= 45) return 'developing';
  return 'critical';
}
