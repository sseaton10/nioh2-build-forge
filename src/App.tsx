// =============================================================================
// Nioh 2 Build Forge — Root App Component (Final Version)
//
// This is the completed App with error boundaries wrapping each screen
// and the admin panel accessible via ?admin=true.
// =============================================================================
import React from 'react';
import { useBuildStore }  from './store/buildStore';
import { BuildList }      from './components/BuildList/BuildList';
import { CharacterSheet } from './components/CharacterSheet/CharacterSheet';
import { BuildAnalysis }  from './components/BuildAnalysis/BuildAnalysis';
import { SessionRoadmap } from './components/SessionRoadmap/SessionRoadmap';
import { AdminPanel }     from './components/Admin/AdminPanel';
import { ErrorBoundary }  from './components/shared/ErrorBoundary';

// Check for ?admin=true in the URL to enable the admin panel.
// This keeps the admin tooling invisible to regular players while
// remaining accessible during development and portfolio demos.
const isAdminMode = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('admin') === 'true';

export default function App() {
  const { currentView } = useBuildStore();

  const appShell = (
    <div style={{
      minHeight: '100vh',
      background: '#111827',
      color: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Each screen is wrapped in its own ErrorBoundary.
          If BuildAnalysis crashes, BuildList and CharacterSheet are unaffected.
          The player's data is safe — only the crashed screen shows a fallback. */}

      {isAdminMode && (
        <ErrorBoundary screenName="Admin Panel">
          <AdminPanel />
        </ErrorBoundary>
      )}

      {!isAdminMode && currentView === 'build_list' && (
        <ErrorBoundary screenName="Build List">
          <BuildList />
        </ErrorBoundary>
      )}

      {!isAdminMode && currentView === 'character_sheet' && (
        <ErrorBoundary screenName="Character Sheet">
          <CharacterSheet />
        </ErrorBoundary>
      )}

      {!isAdminMode && currentView === 'build_analysis' && (
        <ErrorBoundary screenName="Build Analysis">
          <BuildAnalysis />
        </ErrorBoundary>
      )}

      {!isAdminMode && currentView === 'session_roadmap' && (
        <ErrorBoundary screenName="Session Roadmap">
          <SessionRoadmap />
        </ErrorBoundary>
      )}
    </div>
  );

  // Wrap the entire app in a top-level boundary as the last line of defense.
  // This catches any error that slips past the per-screen boundaries.
  return (
    <ErrorBoundary screenName="Application">
      {appShell}
    </ErrorBoundary>
  );
}
