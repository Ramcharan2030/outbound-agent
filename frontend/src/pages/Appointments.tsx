import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  fetchAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
} from '../api/appointments';
import type { Appointment, AppointmentFormData } from '../api/types';
import { getErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';

const TIMEZONES = ['Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London'];
const STATUSES = ['scheduled', 'completed', 'cancelled'] as const;

function blankForm(): AppointmentFormData {
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const toLocal = (d: Date) => d.toISOString().slice(0, 16);
  return {
    title: '',
    contact_name: '',
    contact_phone: '',
    scheduled_start: toLocal(start),
    scheduled_end: toLocal(end),
    timezone: 'Asia/Kolkata',
    status: 'scheduled',
    notes: '',
  };
}

export default function Appointments() {
  const qc = useQueryClient();
  const { data: appts, isLoading, error } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => fetchAppointments(),
    refetchInterval: (query) => query.state.error ? false : 30000,
  });

  const [filter, setFilter] = useState<'all' | 'scheduled' | 'cancelled' | 'completed'>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [form, setForm] = useState<AppointmentFormData>(blankForm());
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [formError, setFormError] = useState('');

  const filtered = (appts ?? []).filter(
    (a) => filter === 'all' || a.status === filter,
  );

  const createMut = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => { toast.success('Appointment created.'); qc.invalidateQueries({ queryKey: ['appointments'] }); closeDrawer(); },
    onError: (err) => {
      const msg = getErrorMessage(err);
      if (msg.includes('409') || msg.toLowerCase().includes('conflict')) {
        setFormError('Scheduling conflict — this time slot overlaps another appointment.');
      } else {
        setFormError(msg);
      }
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AppointmentFormData> }) =>
      updateAppointment(id, data),
    onSuccess: () => { toast.success('Appointment updated.'); qc.invalidateQueries({ queryKey: ['appointments'] }); closeDrawer(); },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelAppointment(id, reason),
    onSuccess: () => { toast.success('Appointment cancelled.'); qc.invalidateQueries({ queryKey: ['appointments'] }); setCancelTarget(null); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function openCreate() {
    setEditTarget(null);
    setForm(blankForm());
    setFormError('');
    setDrawerOpen(true);
  }

  function openEdit(a: Appointment) {
    setEditTarget(a);
    setForm({
      title: a.title,
      contact_name: a.contact_name,
      contact_phone: a.contact_phone,
      scheduled_start: a.scheduled_start.slice(0, 16),
      scheduled_end: a.scheduled_end.slice(0, 16),
      timezone: a.timezone,
      status: a.status,
      notes: a.notes ?? '',
    });
    setFormError('');
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditTarget(null);
    setFormError('');
  }

  function setField<K extends keyof AppointmentFormData>(key: K, val: AppointmentFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setFormError('');
  }

  function validate(): boolean {
    if (!form.title.trim()) { setFormError('Title is required.'); return false; }
    if (!form.contact_name.trim()) { setFormError('Contact name is required.'); return false; }
    if (!form.contact_phone.trim()) { setFormError('Contact phone is required.'); return false; }
    if (!form.scheduled_start) { setFormError('Start time is required.'); return false; }
    if (!form.scheduled_end) { setFormError('End time is required.'); return false; }
    if (form.scheduled_end <= form.scheduled_start) { setFormError('End must be after start.'); return false; }
    return true;
  }

  function submit() {
    if (!validate()) return;
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: form });
    } else {
      createMut.mutate(form);
    }
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="page-content">
      <PageHeader
        title="Appointments"
        description="View, schedule, edit, and cancel appointments."
        icon={Calendar}
        actions={
          <button className="btn btn-primary" onClick={openCreate} id="create-appointment-btn">
            <Plus size={15} /> New Appointment
          </button>
        }
      />

      {/* Filter tabs */}
      <div className="tabs" style={{ marginBottom: 20, width: 'fit-content' }}>
        {(['all', 'scheduled', 'completed', 'cancelled'] as const).map((s) => (
          <button key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingSpinner label="Loading appointments…" /> :
        error ? <div className="inline-alert error">Could not load appointments.</div> :
        filtered.length === 0 ? (
          <EmptyState icon={Calendar} title="No appointments" description={filter === 'all' ? 'Create your first appointment above.' : `No ${filter} appointments.`}
            action={filter === 'all' ? <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> New Appointment</button> : undefined} />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Title</th><th>Contact</th><th>Phone</th><th>Scheduled</th><th>Status</th><th>Source</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.title}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{a.contact_name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)' }}>{a.contact_phone}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      <div>{format(new Date(a.scheduled_start), 'MMM d, yyyy')}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {format(new Date(a.scheduled_start), 'h:mm a')} – {format(new Date(a.scheduled_end), 'h:mm a')}
                      </div>
                    </td>
                    <td><StatusBadge status={a.status} /></td>
                    <td><span className="badge badge-neutral">{a.source}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>Edit</button>
                        {a.status === 'scheduled' && (
                          <button className="btn btn-danger btn-sm" onClick={() => { setCancelTarget(a); setCancelReason(''); }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Create / Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editTarget ? 'Edit Appointment' : 'New Appointment'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeDrawer} disabled={isSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={isSaving}>
              {isSaving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create'}
            </button>
          </>
        }
      >
        {formError && <div className="inline-alert error" style={{ marginBottom: 16 }}>{formError}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label" htmlFor="appt-title">Title *</label>
            <input id="appt-title" className="form-input" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Site Visit" />
          </div>
          <div className="form-grid-2">
            <div>
              <label className="form-label" htmlFor="appt-cname">Contact Name *</label>
              <input id="appt-cname" className="form-input" value={form.contact_name} onChange={(e) => setField('contact_name', e.target.value)} placeholder="Asha" />
            </div>
            <div>
              <label className="form-label" htmlFor="appt-cphone">Contact Phone *</label>
              <input id="appt-cphone" className="form-input" value={form.contact_phone} onChange={(e) => setField('contact_phone', e.target.value)} placeholder="+919999999999" />
            </div>
          </div>
          <div className="form-grid-2">
            <div>
              <label className="form-label" htmlFor="appt-start">Start *</label>
              <input id="appt-start" type="datetime-local" className="form-input" value={form.scheduled_start} onChange={(e) => setField('scheduled_start', e.target.value)} />
            </div>
            <div>
              <label className="form-label" htmlFor="appt-end">End *</label>
              <input id="appt-end" type="datetime-local" className="form-input" value={form.scheduled_end} onChange={(e) => setField('scheduled_end', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="appt-tz">Timezone</label>
            <select id="appt-tz" className="form-input" value={form.timezone} onChange={(e) => setField('timezone', e.target.value)}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          {editTarget && (
            <div>
              <label className="form-label" htmlFor="appt-status">Status</label>
              <select id="appt-status" className="form-input" value={form.status} onChange={(e) => setField('status', e.target.value as AppointmentFormData['status'])}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="form-label" htmlFor="appt-notes">Notes</label>
            <textarea id="appt-notes" className="form-input" value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>
      </Drawer>

      {/* Cancel confirmation with reason */}
      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelMut.mutate({ id: cancelTarget.id, reason: cancelReason })}
        title="Cancel Appointment"
        message={`Cancel "${cancelTarget?.title}" for ${cancelTarget?.contact_name}? This cannot be undone.`}
        confirmLabel="Cancel Appointment"
        loading={cancelMut.isPending}
      />
    </div>
  );
}
