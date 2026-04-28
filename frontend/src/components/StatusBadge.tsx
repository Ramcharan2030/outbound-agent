import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent';

function variantForStatus(status: string): BadgeVariant {
  switch (status.toLowerCase()) {
    case 'scheduled':
    case 'ready':
    case 'ok':
    case 'completed':
    case 'true':
      return 'success';
    case 'pending':
    case 'ingesting':
    case 'running':
    case 'syncing':
      return 'warning';
    case 'cancelled':
    case 'error':
    case 'false':
      return 'error';
    case 'info':
    case 'connected':
      return 'info';
    default:
      return 'neutral';
  }
}

interface StatusBadgeProps {
  status: string;
  label?: string;
  variant?: BadgeVariant;
}

export default function StatusBadge({ status, label, variant }: StatusBadgeProps) {
  const v = variant ?? variantForStatus(status);
  return (
    <span className={`badge badge-${v}`}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'currentColor',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {label ?? status}
    </span>
  );
}
