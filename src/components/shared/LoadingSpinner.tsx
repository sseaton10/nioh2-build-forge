// =============================================================================
// Nioh 2 Build Forge — Loading Spinner
//
// A reusable loading indicator used across all async operations.
// Keeping it in one place means the loading experience is consistent
// everywhere — the compiler, the persistence layer, and the roadmap
// generator all use the same visual when they're working.
// =============================================================================
import React from 'react';

interface Props {
  message?: string;   // optional context message, e.g. "Analyzing build..."
  size?:    'small' | 'medium' | 'large';
}

export function LoadingSpinner({ message, size = 'medium' }: Props) {
  const sizePx = size === 'small' ? 20 : size === 'large' ? 48 : 32;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px' }}>
      <div style={{
        width: sizePx, height: sizePx,
        border: `3px solid #374151`,
        borderTop: `3px solid #f59e0b`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      {message && (
        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>{message}</p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
