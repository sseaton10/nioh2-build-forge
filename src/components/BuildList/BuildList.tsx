'use client'
import React, { useEffect, useState } from 'react';
import { useBuildStore } from '../../store/buildStore';
import { listBuilds, loadBuild, saveBuild, deleteBuild } from '../../persistence';

// Version number — update this when releasing new versions
const APP_VERSION = 'v1.0.1';

export function BuildList() {
  const {
    buildSummaries, isLoadingBuilds,
    setBuildSummaries, setIsLoadingBuilds,
    setActiveBuild, resetToNewBuild, setView,
  } = useBuildStore();

  // Track which build is being renamed inline
  const [renamingId,   setRenamingId]   = useState<string | null>(null);
  const [renameValue,  setRenameValue]  = useState('');
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  useEffect(() => {
    fetchBuilds();
  }, []);

  async function fetchBuilds() {
    setIsLoadingBuilds(true);
    const summaries = await listBuilds();
    setBuildSummaries(summaries);
    setIsLoadingBuilds(false);
  }

  async function handleSelectBuild(buildId: string) {
    const build = await loadBuild(buildId);
    if (build) {
      setActiveBuild(build);
      setView('character_sheet');
    }
  }

  function handleNewBuild() {
    resetToNewBuild();
    setView('character_sheet');
  }

  // Inline rename — clicking the pencil icon opens an input in place of the name
  function handleStartRename(e: React.MouseEvent, buildId: string, currentName: string) {
    e.stopPropagation(); // prevent card click from firing
    setRenamingId(buildId);
    setRenameValue(currentName);
  }

  async function handleConfirmRename(e: React.MouseEvent | React.KeyboardEvent, build: any) {
    e.stopPropagation();
    if (!renameValue.trim()) return;
    await saveBuild({
      buildId:        build.id,
      buildName:      renameValue.trim(),
      identityKey:    build.identity_key,
      characterState: build.character_state ?? {},
      compilerOutput: null,
      phaseKey:       build.phase_key,
    });
    setRenamingId(null);
    fetchBuilds(); // refresh the list
  }

  async function handleDelete(e: React.MouseEvent, buildId: string) {
    e.stopPropagation();
    if (deletingId === buildId) {
      // Second click confirms deletion
      await deleteBuild(buildId);
      setDeletingId(null);
      fetchBuilds();
    } else {
      // First click arms the delete — shows confirmation state
      setDeletingId(buildId);
      setTimeout(() => setDeletingId(null), 3000); // auto-disarm after 3 seconds
    }
  }

  function getHealthColor(health: number | null): string {
    if (health === null) return '#6b7280';
    if (health >= 90)    return '#22c55e';
    if (health >= 70)    return '#84cc16';
    if (health >= 45)    return '#f59e0b';
    return '#ef4444';
  }

  function getHealthLabel(health: number | null): string {
    if (health === null) return 'Not analyzed';
    if (health >= 90)    return 'Optimized';
    if (health >= 70)    return 'Solid';
    if (health >= 45)    return 'Developing';
    return 'Critical';
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>

      {/* Header with version number */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Build Forge</h1>
            <span style={{
              fontSize: '11px', fontWeight: 600, color: '#6b7280',
              background: '#1f2937', padding: '2px 8px', borderRadius: '4px',
              border: '1px solid #374151',
            }}>
              {APP_VERSION}
            </span>
          </div>
          <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '13px' }}>Nioh 2 Build Advisor</p>
        </div>
        <button
          onClick={handleNewBuild}
          style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
        >
          + New Build
        </button>
      </div>

      {isLoadingBuilds && (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Loading builds...</p>
      )}

      {!isLoadingBuilds && buildSummaries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #374151', borderRadius: '12px' }}>
          <p style={{ color: '#9ca3af', marginBottom: '16px' }}>No saved builds yet.</p>
          <button
            onClick={handleNewBuild}
            style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
          >
            Create your first build
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {buildSummaries.map((build) => (
          <div
            key={build.id}
            onClick={() => renamingId !== build.id && handleSelectBuild(build.id)}
            style={{
              background: '#1f2937', border: `1px solid ${deletingId === build.id ? '#ef4444' : '#374151'}`,
              borderRadius: '10px', padding: '14px 16px',
              cursor: renamingId === build.id ? 'default' : 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* Left: name + identity */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {renamingId === build.id ? (
                // Inline rename input
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleConfirmRename(e, build)}
                    style={{
                      flex: 1, background: '#111827', border: '1px solid #f59e0b',
                      borderRadius: '6px', color: '#fff', padding: '4px 8px',
                      fontSize: '14px', fontWeight: 600, outline: 'none',
                    }}
                  />
                  <button
                    onClick={e => handleConfirmRename(e, build)}
                    style={{ background: '#f59e0b', border: 'none', borderRadius: '6px', color: '#000', padding: '4px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setRenamingId(null); }}
                    style={{ background: '#374151', border: 'none', borderRadius: '6px', color: '#9ca3af', padding: '4px 10px', cursor: 'pointer', fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <p style={{ fontWeight: 600, margin: 0, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {build.build_name}
                </p>
              )}
              <p style={{ color: '#9ca3af', margin: '3px 0 0', fontSize: '12px' }}>
                {build.identity_key.replace(/_/g, ' ')} · {build.phase_key?.replace(/_/g, ' ') ?? 'early game'}
              </p>
            </div>

            {/* Center: action buttons */}
            {renamingId !== build.id && (
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {/* Rename button */}
                <button
                  onClick={e => handleStartRename(e, build.id, build.build_name)}
                  title="Rename build"
                  style={{ background: '#374151', border: 'none', borderRadius: '6px', color: '#9ca3af', padding: '5px 8px', cursor: 'pointer', fontSize: '13px' }}
                >
                  ✏️
                </button>
                {/* Delete button — two-tap confirm */}
                <button
                  onClick={e => handleDelete(e, build.id)}
                  title={deletingId === build.id ? 'Tap again to confirm delete' : 'Delete build'}
                  style={{
                    background: deletingId === build.id ? '#7f1d1d' : '#374151',
                    border: 'none', borderRadius: '6px',
                    color: deletingId === build.id ? '#ef4444' : '#9ca3af',
                    padding: '5px 8px', cursor: 'pointer', fontSize: '13px',
                    fontWeight: deletingId === build.id ? 700 : 400,
                  }}
                >
                  {deletingId === build.id ? 'Confirm?' : '🗑️'}
                </button>
              </div>
            )}

            {/* Right: health score */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ color: getHealthColor(build.overall_health), fontWeight: 700, margin: 0, fontSize: '20px' }}>
                {build.overall_health ?? '—'}
              </p>
              <p style={{ color: getHealthColor(build.overall_health), margin: '2px 0 0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {getHealthLabel(build.overall_health)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p style={{ textAlign: 'center', color: '#374151', fontSize: '11px', marginTop: '32px' }}>
        Build Forge {APP_VERSION} · github.com/sseaton10/nioh2-build-forge
      </p>
    </div>
  );
}
