// =============================================================================
// Nioh 2 Build Forge — Admin Panel
//
// A visual interface for the seed health check. Rather than requiring the
// developer to open Supabase's SQL editor every time, this panel runs
// the same validation queries through the Supabase client and displays
// results directly in the app.
//
// Access by navigating to /?admin=true in the browser URL.
// This keeps the admin panel hidden from regular players while still
// being accessible during development and portfolio demos.
// =============================================================================
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// A CheckResult represents one row in the health check output.
interface CheckResult {
  section:    string;
  check_name: string;
  count:      number;
  status:     string;
}

// A TableCount is the row count for a single table — used in the
// overview panel so you can see the size of each table at a glance.
interface TableCount {
  table_name: string;
  row_count:  number;
}

export function AdminPanel() {
  const [tableCounts,  setTableCounts]  = useState<TableCount[]>([]);
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [lastRun,      setLastRun]      = useState<string | null>(null);

  // Run all health checks when the panel first loads.
  useEffect(() => { runHealthChecks(); }, []);

  async function runHealthChecks() {
    setIsLoading(true);
    try {
      await Promise.all([fetchTableCounts(), fetchBusinessRuleChecks()]);
      setLastRun(new Date().toLocaleTimeString());
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch row counts for all seeded tables.
  // We query each table individually rather than using a UNION because
  // Supabase's JS client doesn't support UNION queries directly.
  async function fetchTableCounts() {
    const tables = [
      'rarity_slot_rules', 'item_types', 'phases', 'stats',
      'scaling_grades', 'stat_soft_cap_rules', 'sets',
      'set_bonus_requirements', 'weapons', 'weapon_scaling_stats',
      'armor', 'soul_cores', 'guardian_spirits', 'spirit_passives',
      'spirit_passive_conditions', 'build_identities',
      'build_identity_stats', 'mission_gates', 'modifier_effect_types',
      'modifiers', 'modifier_activation_conditions', 'set_bonus_modifiers',
    ];

    const counts = await Promise.all(
      tables.map(async (table) => {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        return { table_name: table, row_count: count ?? 0 };
      })
    );
    setTableCounts(counts);
  }

  // Run the key business rule checks using Supabase's select API.
  // These are the same checks as the SQL script but expressed as
  // client queries so they can run without the SQL editor.
  async function fetchBusinessRuleChecks() {
    const results: CheckResult[] = [];

    // Check 1: All Fists weapons have exactly 3 scaling stats
    const { data: fistsData } = await supabase
      .from('weapons')
      .select('weapon_key, weapon_scaling_stats(id)')
      .eq('item_type_key', 'fists');

    const fistsViolations = (fistsData ?? []).filter(
      (w: any) => w.weapon_scaling_stats?.length !== 3
    );
    results.push({
      section:    'Business Rules',
      check_name: 'Fists weapons have 3 scaling stats each',
      count:      fistsViolations.length,
      status:     fistsViolations.length === 0 ? 'PASS' : `FAIL — ${fistsViolations.length} violation(s)`,
    });

    // Check 2: All soul cores have at least one modifier
    const { data: coreData } = await supabase
      .from('soul_cores')
      .select('soul_core_key, display_name, modifiers(id)');

    const coreViolations = (coreData ?? []).filter(
      (sc: any) => !sc.modifiers || sc.modifiers.length === 0
    );
    results.push({
      section:    'Business Rules',
      check_name: 'All soul cores have modifier coverage',
      count:      coreViolations.length,
      status:     coreViolations.length === 0 ? 'PASS' : `FAIL — ${coreViolations.length} soul core(s) have no modifiers`,
    });

    // Check 3: Feral Ascendant identity has all 8 stat priorities
    const { data: identityData } = await supabase
      .from('build_identity_stats')
      .select('stat_key, build_identities!inner(identity_key)')
      .eq('build_identities.identity_key', 'feral_ascendant');

    const statCount = identityData?.length ?? 0;
    results.push({
      section:    'Identity Completeness',
      check_name: 'Feral Ascendant has all 8 stat priorities',
      count:      8 - statCount,
      status:     statCount >= 8 ? 'PASS' : `FAIL — only ${statCount}/8 stats defined`,
    });

    // Check 4: Ame-no-Mitori has its key conditional passive
    const { data: spiritData } = await supabase
      .from('spirit_passives')
      .select('passive_name, guardian_spirits!inner(spirit_key)')
      .eq('guardian_spirits.spirit_key', 'ame_no_mitori')
      .eq('passive_name', 'Lightning Damage');

    results.push({
      section:    'Business Rules',
      check_name: 'Ame-no-Mitori has Lightning Damage passive',
      count:      spiritData && spiritData.length > 0 ? 0 : 1,
      status:     spiritData && spiritData.length > 0 ? 'PASS' : 'FAIL — passive missing',
    });

    // Check 5: No inverted target bands in identity stats
    const { data: bandData } = await supabase
      .from('build_identity_stats')
      .select('stat_key, target_band_min, target_band_max')
      .gt('target_band_min', supabase.rpc as any); // fallback: check client-side

    // Client-side check since Supabase client doesn't support column comparisons directly
    const { data: allBands } = await supabase
      .from('build_identity_stats')
      .select('stat_key, target_band_min, target_band_max');

    const invertedBands = (allBands ?? []).filter(
      (b: any) => b.target_band_min > b.target_band_max
    );
    results.push({
      section:    'Business Rules',
      check_name: 'All target bands valid (min ≤ max)',
      count:      invertedBands.length,
      status:     invertedBands.length === 0 ? 'PASS' : `FAIL — ${invertedBands.length} inverted band(s)`,
    });

    setCheckResults(results);
  }

  const passCount = checkResults.filter(r => r.status === 'PASS').length;
  const failCount = checkResults.filter(r => r.status !== 'PASS').length;
  const overallHealthy = failCount === 0 && checkResults.length > 0;

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'monospace' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Build Forge Admin</h1>
          <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '13px' }}>
            Seed validation and database health — not visible to players
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '24px', fontWeight: 900,
            color: overallHealthy ? '#22c55e' : failCount > 0 ? '#ef4444' : '#9ca3af',
          }}>
            {overallHealthy ? '✓ Healthy' : failCount > 0 ? `✗ ${failCount} Failure${failCount > 1 ? 's' : ''}` : '—'}
          </div>
          <button onClick={runHealthChecks} disabled={isLoading}
            style={{ marginTop: '8px', background: '#374151', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
            {isLoading ? 'Running...' : 'Rerun Checks'}
          </button>
          {lastRun && <p style={{ color: '#6b7280', fontSize: '11px', margin: '4px 0 0' }}>Last run: {lastRun}</p>}
        </div>
      </div>

      {/* Business rule checks */}
      <div style={{ background: '#1f2937', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 16px' }}>
          Validation Checks ({passCount} pass / {failCount} fail)
        </h2>
        {isLoading && <p style={{ color: '#9ca3af', fontSize: '13px' }}>Running checks...</p>}
        {checkResults.map((result, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid #374151',
          }}>
            <div>
              <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', marginRight: '8px' }}>
                {result.section}
              </span>
              <span style={{ fontSize: '13px' }}>{result.check_name}</span>
            </div>
            <span style={{
              fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '4px',
              background: result.status === 'PASS' ? '#14532d' : '#7f1d1d',
              color: result.status === 'PASS' ? '#22c55e' : '#ef4444',
            }}>
              {result.status}
            </span>
          </div>
        ))}
      </div>

      {/* Table counts grid */}
      <div style={{ background: '#1f2937', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 16px' }}>
          Table Row Counts
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {tableCounts.map(({ table_name, row_count }) => (
            <div key={table_name} style={{
              background: '#111827', borderRadius: '6px', padding: '10px 12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>{table_name}</span>
              <span style={{
                fontSize: '14px', fontWeight: 700,
                color: row_count === 0 ? '#6b7280' : '#f9fafb',
              }}>
                {row_count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
