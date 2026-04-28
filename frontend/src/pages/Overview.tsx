import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import {
  PhoneCall, Calendar, BookOpen, Activity,
  TrendingUp, Clock, CheckCircle, LayoutDashboard,
} from 'lucide-react';
import { fetchStats } from '../api/stats';
import { fetchLogs } from '../api/logs';
import { fetchAppointments } from '../api/appointments';
import { fetchKbStatus } from '../api/kb';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function Overview() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: fetchStats, refetchInterval: (q) => q.state.error ? false : 30000 });
  const logs = useQuery({ queryKey: ['logs'], queryFn: fetchLogs, refetchInterval: (q) => q.state.error ? false : 30000 });
  const appts = useQuery({ queryKey: ['appointments'], queryFn: () => fetchAppointments() });
  const kb = useQuery({ queryKey: ['kb-status'], queryFn: fetchKbStatus });

  const recentLogs = logs.data?.slice(0, 5) ?? [];
  const upcomingAppts = appts.data
    ?.filter((a) => a.status === 'scheduled')
    .slice(0, 5) ?? [];

  return (
    <div className="page-content">
      <PageHeader
        title="Overview"
        description="System health and recent activity at a glance."
        icon={LayoutDashboard}
      />

      {/* Stats row */}
      {stats.isLoading ? (
        <LoadingSpinner />
      ) : stats.error ? (
        <div className="inline-alert error" style={{ marginBottom: 24 }}>
          Could not load stats. Backend may be unreachable.
        </div>
      ) : stats.data ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <StatCard
            label="Total Calls"
            value={stats.data.total_calls}
            icon={PhoneCall}
            color="var(--accent-400)"
          />
          <StatCard
            label="Total Bookings"
            value={stats.data.total_bookings}
            icon={CheckCircle}
            color="var(--status-success)"
          />
          <StatCard
            label="Booking Rate"
            value={`${stats.data.booking_rate}%`}
            icon={TrendingUp}
            color="var(--status-info)"
          />
          <StatCard
            label="Avg Duration"
            value={fmtDuration(stats.data.avg_duration)}
            icon={Clock}
            color="var(--status-warning)"
          />
        </div>
      ) : null}

      {/* KB status + health row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {/* KB summary */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <BookOpen size={16} color="var(--accent-400)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Knowledge Base</span>
          </div>
          {kb.isLoading ? (
            <LoadingSpinner label="Loading KB status…" />
          ) : kb.data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Row label="Backend" value={kb.data.backend} />
              <Row label="Vectors" value={kb.data.vector_count} />
              <Row label="Sources" value={kb.data.counts?.sources ?? '—'} />
              <Row label="Chunks" value={kb.data.counts?.chunks ?? '—'} />
              <Row
                label="Status"
                value={<StatusBadge status={kb.data.kb_enabled ? 'ok' : 'error'} label={kb.data.kb_enabled ? 'Enabled' : 'Disabled'} />}
              />
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {kb.data === undefined && 'Status unavailable — KB may not be configured.'}
            </p>
          )}
        </div>

        {/* System health */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Activity size={16} color="var(--status-success)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>System</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <HealthRow label="Backend API" healthy={!stats.error} />
            <HealthRow label="Call Logs DB" healthy={!logs.error} />
            <HealthRow label="Appointments" healthy={!appts.error} />
            <HealthRow label="Knowledge Base" healthy={!kb.error} />
          </div>
        </div>
      </div>

      {/* Recent calls */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PhoneCall size={15} color="var(--accent-400)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Recent Calls</span>
          </div>
          <a href="/logs" style={{ fontSize: 13, color: 'var(--accent-400)', textDecoration: 'none' }}>View all →</a>
        </div>
        {logs.isLoading ? (
          <LoadingSpinner />
        ) : recentLogs.length === 0 ? (
          <EmptyState icon={PhoneCall} title="No calls yet" description="Inbound calls will appear here." />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Caller</th>
                  <th>Phone</th>
                  <th>Time</th>
                  <th>Duration</th>
                  <th>Booked</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 500 }}>{log.caller_name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 13 }}>{log.phone_number}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{fmtDuration(log.duration_seconds)}</td>
                    <td>
                      <StatusBadge
                        status={log.was_booked ? 'ok' : 'neutral'}
                        label={log.was_booked ? 'Booked' : 'No booking'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upcoming appointments */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} color="var(--accent-400)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Upcoming Appointments</span>
          </div>
          <a href="/appointments" style={{ fontSize: 13, color: 'var(--accent-400)', textDecoration: 'none' }}>View all →</a>
        </div>
        {appts.isLoading ? (
          <LoadingSpinner />
        ) : upcomingAppts.length === 0 ? (
          <EmptyState icon={Calendar} title="No upcoming appointments" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcomingAppts.map((a) => (
              <div key={a.id} className="scroll-list-item" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{a.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {a.contact_name} · {a.contact_phone}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {format(new Date(a.scheduled_start), 'MMM d, h:mm a')}
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function HealthRow({ label, healthy }: { label: string; healthy: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className={`health-dot ${healthy ? 'ok' : 'error'}`} />
        <span style={{ color: healthy ? 'var(--status-success)' : 'var(--status-error)', fontWeight: 500 }}>
          {healthy ? 'OK' : 'Unreachable'}
        </span>
      </div>
    </div>
  );
}


