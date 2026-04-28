import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, RefreshCw, Trash2, Upload, Search, Link2, Database } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import {
  fetchKbStatus, fetchKbSources, createKbSource, updateKbSource,
  deleteKbSource, syncKbSource, uploadKbFile, fetchKbJobs,
  searchKb, searchInventory, fetchLeadRatStatus, connectLeadRat, syncLeadRat,
} from '../api/kb';
import type { KbSource } from '../api/types';
import { getErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Drawer from '../components/Drawer';
import ConfirmDialog from '../components/ConfirmDialog';

const TABS = ['Status', 'Sources', 'Jobs', 'Search', 'Inventory', 'LeadRat'] as const;
type Tab = typeof TABS[number];

export default function KnowledgeBase() {
  const [tab, setTab] = useState<Tab>('Status');
  return (
    <div className="page-content">
      <PageHeader title="Knowledge Base" description="Manage sources, search the KB, and monitor ingest jobs." icon={BookOpen} />
      <div className="tabs" style={{ marginBottom: 24 }}>
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'Status' && <KbStatusTab />}
      {tab === 'Sources' && <KbSourcesTab />}
      {tab === 'Jobs' && <KbJobsTab />}
      {tab === 'Search' && <KbSearchTab />}
      {tab === 'Inventory' && <KbInventoryTab />}
      {tab === 'LeadRat' && <LeadRatTab />}
    </div>
  );
}

/* ─── Status Tab ───────────────────────────────────────────────── */
function KbStatusTab() {
  const { data, isLoading, error } = useQuery({ queryKey: ['kb-status'], queryFn: fetchKbStatus, refetchInterval: 15000 });
  if (isLoading) return <LoadingSpinner label="Loading KB status…" />;
  if (error || !data) return <div className="inline-alert warn">KB status unavailable — KB may not be configured.</div>;
  if (data.status === 'setup_required' || data.status === 'not_configured') {
    return <div className="inline-alert warn">Knowledge base is not configured. Set <code>kb_enabled</code> and configure the backend in Configuration.</div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
      <InfoCard title="Runtime">
        <Row2 label="Backend" value={data.backend} />
        <Row2 label="Runtime" value={data.runtime} />
        <Row2 label="Embedding" value={`${data.embedding_provider} / ${data.embedding_model}`} />
        <Row2 label="Index Kind" value={data.index_kind} />
        <Row2 label="Data Dir" value={data.data_dir} />
      </InfoCard>
      <InfoCard title="Index">
        <Row2 label="Vector Count" value={data.vector_count} />
        <Row2 label="Last Rebuilt" value={data.last_rebuild_at ? formatDistanceToNow(new Date(data.last_rebuild_at), { addSuffix: true }) : '—'} />
        <Row2 label="Status" value={<StatusBadge status={data.kb_enabled ? 'ok' : 'error'} label={data.kb_enabled ? 'Enabled' : 'Disabled'} />} />
      </InfoCard>
      <InfoCard title="Counts">
        <Row2 label="Sources" value={data.counts?.sources ?? '—'} />
        <Row2 label="Jobs" value={data.counts?.jobs ?? '—'} />
        <Row2 label="Entities" value={data.counts?.entities ?? '—'} />
        <Row2 label="Chunks" value={data.counts?.chunks ?? '—'} />
      </InfoCard>
    </div>
  );
}

/* ─── Sources Tab ─────────────────────────────────────────────── */
function KbSourcesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['kb-sources'], queryFn: fetchKbSources });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<KbSource | null>(null);
  const [delTarget, setDelTarget] = useState<KbSource | null>(null);
  const [sourceType, setSourceType] = useState<'web_url' | 'text_note'>('web_url');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [formErr, setFormErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const sources = data?.items ?? [];

  const createMut = useMutation({
    mutationFn: createKbSource,
    onSuccess: () => { toast.success('Source created.'); qc.invalidateQueries({ queryKey: ['kb-sources'] }); closeDrawer(); },
    onError: (e) => setFormErr(getErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteKbSource(id),
    onSuccess: () => { toast.success('Source deleted.'); qc.invalidateQueries({ queryKey: ['kb-sources'] }); setDelTarget(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const syncMut = useMutation({
    mutationFn: syncKbSource,
    onSuccess: () => { toast.success('Sync job started.'); qc.invalidateQueries({ queryKey: ['kb-sources'] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const uploadMut = useMutation({
    mutationFn: uploadKbFile,
    onSuccess: () => { toast.success('File uploaded and source created.'); qc.invalidateQueries({ queryKey: ['kb-sources'] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => updateKbSource(id, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kb-sources'] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function closeDrawer() { setDrawerOpen(false); setEditTarget(null); setFormErr(''); setTitle(''); setUrl(''); setRawText(''); }

  function submit() {
    if (!title.trim()) { setFormErr('Title required.'); return; }
    if (sourceType === 'web_url' && !url.trim()) { setFormErr('URL required.'); return; }
    if (sourceType === 'text_note' && !rawText.trim()) { setFormErr('Text content required.'); return; }
    createMut.mutate({ source_type: sourceType, title: title.trim(), source_url: sourceType === 'web_url' ? url.trim() : undefined, raw_text: sourceType === 'text_note' ? rawText.trim() : undefined, enabled: true });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMut.mutate(file);
    e.target.value = '';
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditTarget(null); setDrawerOpen(true); }}><Plus size={14} /> Add Source</button>
          <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploadMut.isPending}>
            <Upload size={14} /> {uploadMut.isPending ? 'Uploading…' : 'Upload File'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.csv" style={{ display: 'none' }} onChange={handleFileChange} id="kb-file-upload" />
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : sources.length === 0 ? (
        <EmptyState icon={BookOpen} title="No sources" description="Add a web URL, text note, or upload a file." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Enabled</th><th>Last Synced</th><th></th></tr></thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>
                    {s.title}
                    {s.source_url && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.source_url.slice(0, 50)}…</div>}
                    {s.sync_error && <div style={{ fontSize: 12, color: 'var(--status-error)', marginTop: 2 }}>{s.sync_error}</div>}
                  </td>
                  <td><span className="badge badge-accent">{s.source_type}</span></td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={s.enabled} onChange={(e) => toggleMut.mutate({ id: s.id, enabled: e.target.checked })} />
                      <span className="toggle-slider" />
                    </label>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {s.last_synced_at ? formatDistanceToNow(new Date(s.last_synced_at), { addSuffix: true }) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => syncMut.mutate(s.id)} title="Sync source" disabled={syncMut.isPending}><RefreshCw size={13} /></button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-error)' }} onClick={() => setDelTarget(s)} title="Delete source"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={drawerOpen} onClose={closeDrawer} title="Add KB Source"
        footer={<><button className="btn btn-secondary" onClick={closeDrawer}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={createMut.isPending}>{createMut.isPending ? 'Creating…' : 'Create'}</button></>}>
        {formErr && <div className="inline-alert error" style={{ marginBottom: 14 }}>{formErr}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Source Type</label>
            <div className="tabs" style={{ width: 'fit-content' }}>
              <button className={`tab ${sourceType === 'web_url' ? 'active' : ''}`} onClick={() => setSourceType('web_url')}>Web URL</button>
              <button className={`tab ${sourceType === 'text_note' ? 'active' : ''}`} onClick={() => setSourceType('text_note')}>Text Note</button>
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="ks-title">Title *</label>
            <input id="ks-title" className="form-input" value={title} onChange={(e) => { setTitle(e.target.value); setFormErr(''); }} placeholder="Company FAQ" />
          </div>
          {sourceType === 'web_url' ? (
            <div>
              <label className="form-label" htmlFor="ks-url">URL *</label>
              <input id="ks-url" className="form-input" value={url} onChange={(e) => { setUrl(e.target.value); setFormErr(''); }} placeholder="https://example.com/faq" />
            </div>
          ) : (
            <div>
              <label className="form-label" htmlFor="ks-text">Text Content *</label>
              <textarea id="ks-text" className="form-input" value={rawText} onChange={(e) => { setRawText(e.target.value); setFormErr(''); }} style={{ minHeight: 140 }} placeholder="Paste content here…" />
            </div>
          )}
        </div>
      </Drawer>

      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)}
        onConfirm={() => delTarget && deleteMut.mutate(delTarget.id)}
        title="Delete Source" message={`Delete "${delTarget?.title}"? All associated chunks will be removed.`}
        confirmLabel="Delete" loading={deleteMut.isPending} />
    </>
  );
}

/* ─── Jobs Tab ────────────────────────────────────────────────── */
function KbJobsTab() {
  const { data, isLoading } = useQuery({ queryKey: ['kb-jobs'], queryFn: fetchKbJobs, refetchInterval: 5000 });
  const jobs = data?.items ?? [];
  if (isLoading) return <LoadingSpinner label="Loading jobs…" />;
  if (jobs.length === 0) return <EmptyState icon={Database} title="No jobs" description="Ingest jobs appear here after syncing a source." />;
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead><tr><th>Job ID</th><th>Source ID</th><th>Type</th><th>Status</th><th>Created</th></tr></thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id}>
              <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{j.id}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{j.source_id}</td>
              <td><span className="badge badge-neutral">{j.job_type}</span></td>
              <td><StatusBadge status={j.status} /></td>
              <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDistanceToNow(new Date(j.created_at), { addSuffix: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Search Tab ──────────────────────────────────────────────── */
function KbSearchTab() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof searchKb>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setErr(''); setResult(null);
    try { setResult(await searchKb(query.trim())); } catch (ex) { setErr(getErrorMessage(ex)); } finally { setLoading(false); }
  }

  return (
    <div>
      <form onSubmit={doSearch} style={{ display: 'flex', gap: 10, marginBottom: 24, maxWidth: 600 }}>
        <input id="kb-search-query" className="form-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="What is the booking policy?" style={{ flex: 1 }} />
        <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}><Search size={15} /> {loading ? 'Searching…' : 'Search'}</button>
      </form>
      {err && <div className="inline-alert error" style={{ marginBottom: 16 }}>{err}</div>}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {result.result.chunk_hits.length === 0 && result.result.inventory_hits.length === 0 && (
            <EmptyState icon={Search} title="No results" description="Try a different query." />
          )}
          {result.result.chunk_hits.map((hit, i) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{hit.title}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="badge badge-accent">{hit.source_type}</span>
                  <span className="badge badge-info">score {hit.score.toFixed(2)}</span>
                </div>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{hit.preview || hit.content}</p>
              {hit.source_url && <a href={hit.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent-400)', marginTop: 8, display: 'block' }}>{hit.source_url}</a>}
            </div>
          ))}
          {result.grounding.grounding_text && (
            <details>
              <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Grounding context</summary>
              <pre className="transcript-pre" style={{ marginTop: 8 }}>{result.grounding.grounding_text}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Inventory Tab ───────────────────────────────────────────── */
function KbInventoryTab() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Awaited<ReturnType<typeof searchInventory>>['items'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setErr(''); setItems(null);
    try { const r = await searchInventory(query.trim()); setItems(r.items); } catch (ex) { setErr(getErrorMessage(ex)); } finally { setLoading(false); }
  }

  return (
    <div>
      <form onSubmit={doSearch} style={{ display: 'flex', gap: 10, marginBottom: 24, maxWidth: 600 }}>
        <input id="inv-search-query" className="form-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="3 BHK Hyderabad under 1.5Cr" style={{ flex: 1 }} />
        <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}><Search size={15} /> {loading ? '…' : 'Search'}</button>
      </form>
      {err && <div className="inline-alert error" style={{ marginBottom: 16 }}>{err}</div>}
      {items && (
        items.length === 0 ? <EmptyState icon={Database} title="No inventory matches" /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {items.map((item, i) => (
              <div key={i} className="inventory-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</span>
                  <span className="badge badge-info">score {item.score.toFixed(1)}</span>
                </div>
                {item.project_name && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{item.project_name}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {item.bhk_text && <span className="badge badge-neutral">{item.bhk_text}</span>}
                  {item.price_text && <span className="badge badge-success">{item.price_text}</span>}
                  {item.location_text && <span className="badge badge-neutral">📍 {item.location_text}</span>}
                  {item.status && <StatusBadge status={item.status} />}
                </div>
                {item.possession_text && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>🏗 {item.possession_text}</div>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

/* ─── LeadRat Tab ─────────────────────────────────────────────── */
function LeadRatTab() {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({ queryKey: ['leadrat-status'], queryFn: fetchLeadRatStatus, refetchInterval: 30000 });
  const connectMut = useMutation({ mutationFn: connectLeadRat, onSuccess: () => { toast.success('LeadRat connected.'); qc.invalidateQueries({ queryKey: ['leadrat-status'] }); }, onError: (e) => toast.error(getErrorMessage(e)) });
  const syncMut = useMutation({ mutationFn: syncLeadRat, onSuccess: () => { toast.success('Sync started.'); refetch(); }, onError: (e) => toast.error(getErrorMessage(e)) });

  if (isLoading) return <LoadingSpinner label="Loading LeadRat status…" />;

  const notConfigured = !data || data.status === 'setup_required' || data.status === 'not_configured';
  const integration = data?.integration ?? {};

  return (
    <div style={{ maxWidth: 560 }}>
      {notConfigured ? (
        <div className="inline-alert warn" style={{ marginBottom: 20 }}>
          <Link2 size={16} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>LeadRat not configured</div>
            <div style={{ fontSize: 13 }}>{data?.message || 'Set leadrat_enabled, leadrat_tenant, leadrat_api_key, and leadrat_secret_key in Configuration.'}</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Row2 label="Enabled" value={<StatusBadge status={integration.enabled ? 'ok' : 'neutral'} label={integration.enabled ? 'Yes' : 'No'} />} />
            <Row2 label="Tenant" value={integration.tenant || '—'} />
            <Row2 label="Connected" value={<StatusBadge status={integration.connected ? 'ok' : 'error'} label={integration.connected ? 'Connected' : 'Not connected'} />} />
            <Row2 label="Last Sync" value={integration.last_sync ? formatDistanceToNow(new Date(integration.last_sync), { addSuffix: true }) : '—'} />
            <Row2 label="Records" value={integration.records ?? '—'} />
            <Row2 label="Sync Interval" value={integration.sync_interval_minutes ? `${integration.sync_interval_minutes} min` : '—'} />
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={() => connectMut.mutate()} disabled={connectMut.isPending}><Link2 size={14} /> {connectMut.isPending ? 'Connecting…' : 'Test Connection'}</button>
        <button className="btn btn-primary" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}><RefreshCw size={14} /> {syncMut.isPending ? 'Syncing…' : 'Sync Now'}</button>
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <p className="section-title" style={{ marginBottom: 12 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

function Row2({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
