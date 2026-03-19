import React, { useEffect } from 'react';
import { useBuildStore } from '../../store/buildStore';
import { listBuilds, loadBuild } from '../../persistence';

export function BuildList() {
  const {
    buildSummaries, isLoadingBuilds,
    setBuildSummaries, setIsLoadingBuilds,
    setActiveBuild, resetToNewBuild, setView,
  } = useBuildStore();

  useEffect(() => {
    async function fetchBuilds() {
      setIsLoadingBuilds(true);
      const summaries = await listBuilds();
      setBuildSummaries(summaries);
      setIsLoadingBuilds(false);
    }
    fetchBuilds();
  }, []);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Build Forge</h1>
          <p style={{ color: '#9ca3af', margin: '4px 0 0' }}>Nioh 2 Build Advisor</p>
        </div>
        <button onClick={handleNewBuild} style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
          + New Build
        </button>
      </div>

      {isLoadingBuilds && <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Loading builds...</p>}

      {!isLoadingBuilds && buildSummaries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #374151', borderRadius: '12px' }}>
          <p style={{ color: '#9ca3af', marginBottom: '16px' }}>No saved builds yet.</p>
          <button onClick={handleNewBuild} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
            Create your first build
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {buildSummaries.map((build) => (
          <div key={build.id} onClick={() => handleSelectBuild(build.id)}
            style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '10px', padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600, margin: 0 }}>{build.build_name}</p>
              <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '13px' }}>
                {build.identity_key.replace(/_/g, ' ')} · {build.phase_key?.replace(/_/g, ' ') ?? 'early game'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: getHealthColor(build.overall_health), fontWeight: 700, margin: 0, fontSize: '20px' }}>
                {build.overall_health ?? '—'}
              </p>
              <p style={{ color: getHealthColor(build.overall_health), margin: '2px 0 0', fontSize: '11px', textTransform: 'uppercase' }}>
                {getHealthLabel(build.overall_health)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
