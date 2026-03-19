// =============================================================================
// Nioh 2 Build Forge — Build Persistence Layer
//
// This file is the only place in the application that reads and writes
// saved builds. Everything else — the UI, the compiler, the engine —
// calls these functions and never touches the database directly for builds.
// This separation is called "encapsulation": the rest of the app doesn't
// need to know HOW builds are stored, only that they can be saved and loaded.
//
// OPTIMISTIC SAVE PATTERN:
// The saveBuild function returns immediately with the updated build data
// before the database confirms the write. The UI updates instantly, and
// if the database write fails, the error is surfaced after the fact.
// This makes the app feel fast even on slow connections.
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { CharacterState } from '../engine/types';
import { CompilerOutput } from '../compiler/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// A SavedBuild is the complete object returned when loading a build.
// It includes the stored state and the last compiler output so the UI
// can render the build health panel without running the compiler again.
export interface SavedBuild {
  id:               string;
  build_name:       string;
  identity_key:     string;
  character_state:  CharacterState;
  compiler_output:  CompilerOutput | null;
  overall_health:   number | null;
  phase_key:        string | null;
  notes:            string | null;
  created_at:       string;
  updated_at:       string;
}

// A BuildSummary is a lightweight version for the build list UI —
// it omits the full character_state and compiler_output blobs so the
// list loads fast even when the player has many saved builds.
export interface BuildSummary {
  id:             string;
  build_name:     string;
  identity_key:   string;
  overall_health: number | null;
  phase_key:      string | null;
  updated_at:     string;
}

export interface BuildSnapshot {
  id:               string;
  snapshot_number:  number;
  overall_health:   number | null;
  notes:            string | null;
  created_at:       string;
}

// =============================================================================
// saveBuild
// Creates a new saved build or updates an existing one.
// If buildId is null, a new build is created. If buildId is provided,
// the existing build is updated in place — the trigger handles snapshotting.
//
// Returns the saved build's ID so the caller can update its local state.
// =============================================================================
export async function saveBuild(params: {
  buildId:         string | null;
  buildName:       string;
  identityKey:     string;
  characterState:  CharacterState;
  compilerOutput:  CompilerOutput | null;
  phaseKey?:       string;
  notes?:          string;
}): Promise<{ id: string; error: string | null }> {

  const {
    buildId, buildName, identityKey,
    characterState, compilerOutput,
    phaseKey, notes,
  } = params;

  // Extract overall_health from compiler output for the denormalized column.
  // Storing this separately lets the database sort by health without parsing JSONB.
  const overallHealth = compilerOutput?.overall_health ?? null;

  if (buildId) {
    // UPDATE existing build
    const { error } = await supabase
      .from('saved_builds')
      .update({
        build_name:      buildName,
        character_state: characterState,
        compiler_output: compilerOutput,
        overall_health:  overallHealth,
        phase_key:       phaseKey ?? null,
        notes:           notes ?? null,
        // updated_at is handled automatically by the database trigger
      })
      .eq('id', buildId);

    if (error) {
      console.error('Build update failed:', error.message);
      return { id: buildId, error: error.message };
    }
    return { id: buildId, error: null };

  } else {
    // INSERT new build
    const { data, error } = await supabase
      .from('saved_builds')
      .insert({
        build_name:      buildName,
        identity_key:    identityKey,
        character_state: characterState,
        compiler_output: compilerOutput,
        overall_health:  overallHealth,
        phase_key:       phaseKey ?? null,
        notes:           notes ?? null,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Build insert failed:', error?.message);
      return { id: '', error: error?.message ?? 'Insert failed' };
    }
    return { id: data.id, error: null };
  }
}

// =============================================================================
// loadBuild
// Loads a single saved build by ID, including the full character_state
// and compiler_output. Called when the player selects a build to work on.
// =============================================================================
export async function loadBuild(buildId: string): Promise<SavedBuild | null> {
  const { data, error } = await supabase
    .from('saved_builds')
    .select('*')
    .eq('id', buildId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error('Build load failed:', error?.message);
    return null;
  }

  return data as SavedBuild;
}

// =============================================================================
// listBuilds
// Returns a lightweight summary list of all active builds, sorted by
// most recently updated first. Used for the build selection panel.
// =============================================================================
export async function listBuilds(
  identityKeyFilter?: string
): Promise<BuildSummary[]> {
  let query = supabase
    .from('saved_builds')
    .select('id, build_name, identity_key, overall_health, phase_key, updated_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  // Optional filter by identity — lets the UI show only builds matching
  // the currently selected build identity.
  if (identityKeyFilter) {
    query = query.eq('identity_key', identityKeyFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Build list failed:', error.message);
    return [];
  }

  return (data ?? []) as BuildSummary[];
}

// =============================================================================
// deleteBuild
// Soft-deletes a build by setting is_active = false.
// The data is never actually removed — soft deletion is safer because:
//   1. The player can recover from accidental deletion (future feature)
//   2. Snapshot history is preserved for the record
//   3. The unique build name becomes available again for new builds
// =============================================================================
export async function deleteBuild(buildId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('saved_builds')
    .update({ is_active: false })
    .eq('id', buildId);

  if (error) {
    console.error('Build delete failed:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

// =============================================================================
// loadSnapshotHistory
// Returns the snapshot timeline for a build — a list of health scores and
// timestamps showing how the build evolved across sessions.
// Used for the "build history" panel in the UI.
// =============================================================================
export async function loadSnapshotHistory(
  buildId: string
): Promise<BuildSnapshot[]> {
  const { data, error } = await supabase
    .from('build_snapshots')
    .select('id, snapshot_number, overall_health, notes, created_at')
    .eq('saved_build_id', buildId)
    .order('snapshot_number', { ascending: false });

  if (error) {
    console.error('Snapshot history load failed:', error.message);
    return [];
  }

  return (data ?? []) as BuildSnapshot[];
}

// =============================================================================
// loadSnapshot
// Loads a specific historical snapshot and reconstructs the CharacterState
// from it, allowing the player to "rewind" to a previous build state.
// This is the restore functionality — it doesn't overwrite the current build,
// it just returns the historical state for the player to review or re-apply.
// =============================================================================
export async function loadSnapshot(
  buildId: string,
  snapshotNumber: number
): Promise<{ characterState: CharacterState; compilerOutput: CompilerOutput | null } | null> {
  const { data, error } = await supabase
    .from('build_snapshots')
    .select('character_state, compiler_output')
    .eq('saved_build_id', buildId)
    .eq('snapshot_number', snapshotNumber)
    .single();

  if (error || !data) {
    console.error('Snapshot load failed:', error?.message);
    return null;
  }

  return {
    characterState: data.character_state as CharacterState,
    compilerOutput: data.compiler_output as CompilerOutput | null,
  };
}

// =============================================================================
// duplicateBuild
// Creates a copy of an existing build under a new name.
// Useful when the player wants to experiment with a variation of their
// current build without losing the original. The duplicate starts with
// a clean snapshot history — it doesn't inherit the original's timeline.
// =============================================================================
export async function duplicateBuild(
  buildId: string,
  newName: string
): Promise<{ id: string; error: string | null }> {

  const original = await loadBuild(buildId);
  if (!original) return { id: '', error: 'Original build not found' };

  return saveBuild({
    buildId:        null,   // null = create new
    buildName:      newName,
    identityKey:    original.identity_key,
    characterState: original.character_state,
    compilerOutput: original.compiler_output,
    phaseKey:       original.phase_key ?? undefined,
    notes:          `Duplicated from "${original.build_name}"`,
  });
}
