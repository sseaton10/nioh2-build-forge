// =============================================================================
// Nioh 2 Build Forge — Global Build Store (Zustand)
//
// This store is the single source of truth for the application's active state.
// Any component can read from it or write to it without prop drilling.
//
// WHY ZUSTAND OVER REACT CONTEXT:
// React Context re-renders every component that consumes it whenever any
// value changes. Zustand is smarter — components only re-render when the
// specific slice of state they care about changes. For a build tool where
// stat changes trigger recalculations, this matters for performance.
//
// HOW TO READ THIS FILE:
// The store is one object with two parts: data fields (what is currently
// stored) and action functions (things that can change the data).
// Components call the action functions in response to user interactions,
// and React automatically re-renders anything that reads the affected fields.
// =============================================================================

import { create } from 'zustand';
import { CharacterState } from '../engine/types';
import { CompilerOutput } from '../compiler/types';
import { SessionRoadmap } from '../roadmap/types';
import { SavedBuild, BuildSummary } from '../persistence';

// The View type controls which screen is visible.
// This is simpler than a full router for a single-page tool.
type View = 'build_list' | 'character_sheet' | 'build_analysis' | 'session_roadmap';

interface BuildStore {
  // -------------------------------------------------------------------------
  // NAVIGATION STATE
  // -------------------------------------------------------------------------
  currentView:        View;
  setView:            (view: View) => void;

  // -------------------------------------------------------------------------
  // BUILD LIST STATE
  // The list of saved build summaries for the build selection panel.
  // -------------------------------------------------------------------------
  buildSummaries:     BuildSummary[];
  isLoadingBuilds:    boolean;
  setBuildSummaries:  (summaries: BuildSummary[]) => void;
  setIsLoadingBuilds: (loading: boolean) => void;

  // -------------------------------------------------------------------------
  // ACTIVE BUILD STATE
  // The build the player is currently working on.
  // activeBuildId is null when working on an unsaved new build.
  // -------------------------------------------------------------------------
  activeBuildId:      string | null;
  activeBuildName:    string;
  identityKey:        string;
  characterState:     CharacterState;
  setActiveBuild:     (build: SavedBuild) => void;
  setActiveBuildId:   (id: string | null) => void;
  setActiveBuildName: (name: string) => void;
  setIdentityKey:     (key: string) => void;

  // -------------------------------------------------------------------------
  // CHARACTER STATE ACTIONS
  // Individual updaters for each part of the character state.
  // Having granular updaters means React only re-renders the components
  // that care about the specific field that changed.
  // -------------------------------------------------------------------------
  updateStat:         (statKey: keyof CharacterState['stats'], value: number) => void;
  updateEquippedWeapon:   (weaponId: string | null) => void;
  updateEquippedSecondary:(secondaryId: string | null) => void;
  updateEquippedSpirit:   (spiritId: string | null) => void;
  updateEquippedSoulCore: (index: number, coreId: string | null) => void;
  updateEquippedArmor:    (slot: keyof CharacterState['equippedArmor'], armorId: string | null) => void;
  updateRuntimeState:     (updates: Partial<Pick<CharacterState,
    'currentHealthPercent' | 'currentKiPercent' | 'isInYokaiShift' |
    'hasYasakaniMagatama' | 'activeEnemyStatuses'>>) => void;

  // -------------------------------------------------------------------------
  // COMPILER OUTPUT STATE
  // The result of the last compileBuild call.
  // null means the compiler hasn't been run yet for the current state.
  // -------------------------------------------------------------------------
  compilerOutput:     CompilerOutput | null;
  isCompiling:        boolean;
  setCompilerOutput:  (output: CompilerOutput | null) => void;
  setIsCompiling:     (compiling: boolean) => void;

  // -------------------------------------------------------------------------
  // ROADMAP STATE
  // The result of the last generateRoadmap call.
  // -------------------------------------------------------------------------
  sessionRoadmap:       SessionRoadmap | null;
  isGeneratingRoadmap:  boolean;
  sessionGoal:          'boss_clear' | 'build_test' | 'farm_mats' | 'progression';
  availableMinutes:     number;
  setSessionRoadmap:    (roadmap: SessionRoadmap | null) => void;
  setIsGeneratingRoadmap:(generating: boolean) => void;
  setSessionGoal:       (goal: BuildStore['sessionGoal']) => void;
  setAvailableMinutes:  (minutes: number) => void;

  // -------------------------------------------------------------------------
  // PERSISTENCE STATE
  // Tracks whether the current build has unsaved changes.
  // -------------------------------------------------------------------------
  hasUnsavedChanges:  boolean;
  isSaving:           boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setIsSaving:        (saving: boolean) => void;

  // -------------------------------------------------------------------------
  // RESET
  // Clears active build state for starting a new build.
  // -------------------------------------------------------------------------
  resetToNewBuild:    () => void;
}

// The default character state represents a fresh character at level 1.
// Stats start at 5 (Nioh 2's minimum) except for identity-specific ones.
const defaultCharacterState: CharacterState = {
  stats: {
    strength: 5, constitution: 5, stamina: 5,
    courage: 5, heart: 5, skill: 5, dexterity: 5, magic: 5,
  },
  currentHealthPercent: 100,
  currentKiPercent:     100,
  equippedWeaponId:         null,
  equippedSecondaryId:      null,
  equippedGuardianSpiritId: null,
  equippedSoulCoreIds:      [],
  equippedArmor: { head: null, chest: null, hands: null, legs: null },
  hasYasakaniMagatama: false,
  isInYokaiShift:      false,
  activeEnemyStatuses: [],
};

export const useBuildStore = create<BuildStore>((set, get) => ({
  // Navigation
  currentView: 'build_list',
  setView: (view) => set({ currentView: view }),

  // Build list
  buildSummaries:     [],
  isLoadingBuilds:    false,
  setBuildSummaries:  (summaries) => set({ buildSummaries: summaries }),
  setIsLoadingBuilds: (loading)   => set({ isLoadingBuilds: loading }),

  // Active build
  activeBuildId:   null,
  activeBuildName: 'New Build',
  identityKey:     'feral_ascendant',
  characterState:  defaultCharacterState,

  setActiveBuild: (build) => set({
    activeBuildId:   build.id,
    activeBuildName: build.build_name,
    identityKey:     build.identity_key,
    characterState:  build.character_state,
    compilerOutput:  build.compiler_output,
    hasUnsavedChanges: false,
  }),

  setActiveBuildId:   (id)   => set({ activeBuildId: id }),
  setActiveBuildName: (name) => set({ activeBuildName: name, hasUnsavedChanges: true }),
  setIdentityKey:     (key)  => set({ identityKey: key, hasUnsavedChanges: true }),

  // Granular character state updaters
  // Each one merges its specific change into the existing characterState
  // rather than replacing the whole object — this prevents accidental
  // overwrites of fields the updater isn't responsible for.
  updateStat: (statKey, value) => set((state) => ({
    characterState: {
      ...state.characterState,
      stats: { ...state.characterState.stats, [statKey]: value },
    },
    hasUnsavedChanges: true,
    compilerOutput: null, // invalidate compiler output when state changes
  })),

  updateEquippedWeapon: (weaponId) => set((state) => ({
    characterState: { ...state.characterState, equippedWeaponId: weaponId },
    hasUnsavedChanges: true,
    compilerOutput: null,
  })),

  updateEquippedSecondary: (secondaryId) => set((state) => ({
    characterState: { ...state.characterState, equippedSecondaryId: secondaryId },
    hasUnsavedChanges: true,
    compilerOutput: null,
  })),

  updateEquippedSpirit: (spiritId) => set((state) => ({
    characterState: { ...state.characterState, equippedGuardianSpiritId: spiritId },
    hasUnsavedChanges: true,
    compilerOutput: null,
  })),

  updateEquippedSoulCore: (index, coreId) => set((state) => {
    const cores = [...state.characterState.equippedSoulCoreIds];
    if (coreId === null) cores.splice(index, 1);
    else cores[index] = coreId;
    return {
      characterState: { ...state.characterState, equippedSoulCoreIds: cores },
      hasUnsavedChanges: true,
      compilerOutput: null,
    };
  }),

  updateEquippedArmor: (slot, armorId) => set((state) => ({
    characterState: {
      ...state.characterState,
      equippedArmor: { ...state.characterState.equippedArmor, [slot]: armorId },
    },
    hasUnsavedChanges: true,
    compilerOutput: null,
  })),

  updateRuntimeState: (updates) => set((state) => ({
    characterState: { ...state.characterState, ...updates },
    compilerOutput: null,
  })),

  // Compiler
  compilerOutput:    null,
  isCompiling:       false,
  setCompilerOutput: (output)    => set({ compilerOutput: output }),
  setIsCompiling:    (compiling) => set({ isCompiling: compiling }),

  // Roadmap
  sessionRoadmap:        null,
  isGeneratingRoadmap:   false,
  sessionGoal:           'progression',
  availableMinutes:      20,
  setSessionRoadmap:     (roadmap)    => set({ sessionRoadmap: roadmap }),
  setIsGeneratingRoadmap:(generating) => set({ isGeneratingRoadmap: generating }),
  setSessionGoal:        (goal)       => set({ sessionGoal: goal }),
  setAvailableMinutes:   (minutes)    => set({ availableMinutes: minutes }),

  // Persistence
  hasUnsavedChanges: false,
  isSaving:          false,
  setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),
  setIsSaving:          (saving)     => set({ isSaving: saving }),

  // Reset for new build
  resetToNewBuild: () => set({
    activeBuildId:     null,
    activeBuildName:   'New Build',
    identityKey:       'feral_ascendant',
    characterState:    defaultCharacterState,
    compilerOutput:    null,
    sessionRoadmap:    null,
    hasUnsavedChanges: false,
  }),
}));
