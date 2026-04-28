import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, PhoneOutgoing } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { fetchContacts } from '../api/contacts';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function Contacts() {
  const { data: contacts, isLoading, error } = useQuery({
    queryKey: ['contacts'],
    queryFn: fetchContacts,
  });

  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = (contacts ?? []).filter((c) => {
    const q = search.toLowerCase();
    return c.caller_name?.toLowerCase().includes(q) || c.phone_number.includes(q);
  });

  return (
    <div className="page-content">
      <PageHeader
        title="Contacts"
        description="Callers derived from call history and appointments."
        icon={Users}
      />

      <div className="search-bar" style={{ marginBottom: 20, maxWidth: 400 }}>
        <Search size={15} className="search-icon" />
        <input
          id="contacts-search"
          type="search"
          className="form-input"
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? <LoadingSpinner label="Loading contacts…" /> :
        error ? <div className="inline-alert error">Could not load contacts.</div> :
        filtered.length === 0 ? (
          <EmptyState icon={Users} title="No contacts found" description={search ? 'Try a different search.' : 'Contacts appear after calls are logged.'} />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Total Calls</th>
                  <th>Appointments</th>
                  <th>Last Seen</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.phone_number}>
                    <td style={{ fontWeight: 500 }}>{c.caller_name || <span style={{ color: 'var(--text-muted)' }}>Unknown</span>}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)' }}>{c.phone_number}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.total_calls}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.appointment_count}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {formatDistanceToNow(new Date(c.last_seen), { addSuffix: true })}
                    </td>
                    <td>
                      <StatusBadge
                        status={c.is_booked ? 'ok' : 'neutral'}
                        label={c.is_booked ? 'Booked' : 'Not booked'}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate('/calls', { state: { phone: c.phone_number, name: c.caller_name } })}
                        title="Dispatch outbound call"
                      >
                        <PhoneOutgoing size={13} /> Call
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
