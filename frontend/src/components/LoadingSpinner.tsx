import React from 'react';

export default function LoadingSpinner({ size = 20, label = 'Loading…' }: { size?: number; label?: string }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32, color: 'var(--text-muted)' }}
      role="status"
      aria-label={label}
    >
      <div
        style={{
          width: size,
          height: size,
          border: `2px solid var(--border-default)`,
          borderTopColor: 'var(--accent-500)',
          borderRadius: '50%',
        }}
        className="animate-spin"
      />
      <span style={{ fontSize: 14 }}>{label}</span>
    </div>
  );
}
