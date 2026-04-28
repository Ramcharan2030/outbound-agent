import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PhoneCall, Search, Download, Copy } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import { fetchLogs, fetchTranscript } from '../api/logs';
import type { CallLog } from '../api/types';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export default function CallLogs() {
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['logs'],
    queryFn: fetchLogs,
    refetchInterval: (q) => q.state.error ? false : 15000,
  });

  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  const filtered = (logs ?? []).filter((l) => {
    const q = search.toLowerCase();
    return (
      l.caller_name?.toLowerCase().includes(q) ||
      l.phone_number.includes(q) ||
      l.summary?.toLowerCase().includes(q)
    );
  });

  async function openTranscript(log: CallLog) {
    setSelectedLog(log);
    setTranscript(null);
    setTranscriptLoading(true);
    try {
      const text = await fetchTranscript(log.id);
      setTranscript(text);
    } catch {
      setTranscript('Transcript not available.');
    } finally {
      setTranscriptLoading(false);
    }
  }

  function copyTranscript() {
    if (transcript) { navigator.clipboard.writeText(transcript); toast.success('Copied.'); }
  }

  function downloadTranscript() {
    if (!transcript || !selectedLog) return;
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${selectedLog.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-content">
      <PageHeader title="Call Logs" description="Inbound call history, summaries, and transcripts." icon={PhoneCall} />

      <div className="search-bar" style={{ marginBottom: 20, maxWidth: 400 }}>
        <Search size={15} className="search-icon" />
        <input id="logs-search" type="search" className="form-input" placeholder="Search caller, phone, summary…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? <LoadingSpinner label="Loading call logs…" /> :
        error ? <div className="inline-alert error">Could not load call logs.</div> :
        filtered.length === 0 ? <EmptyState icon={PhoneCall} title="No calls found" description={search ? 'Try a different search term.' : 'Inbound calls will appear here.'} /> : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Caller</th><th>Phone</th><th>Date</th><th>Duration</th><th>Summary</th><th>Booked</th><th>Latency</th><th></th></tr></thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 500 }}>{log.caller_name || <span style={{ color: 'var(--text-muted)' }}>Unknown</span>}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)' }}>{log.phone_number}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      <div>{format(new Date(log.created_at), 'MMM d, yyyy')}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{fmtDuration(log.duration_seconds)}</td>
                    <td style={{ maxWidth: 220, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.summary || '—'}</div>
                    </td>
                    <td><StatusBadge status={log.was_booked ? 'ok' : 'neutral'} label={log.was_booked ? 'Booked' : 'No booking'} /></td>
                    <td>
                      {log.latency_summary ? (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⚡ {Math.round(log.latency_summary.total_turn_ms)}ms</span>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => openTranscript(log)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <Modal open={!!selectedLog} onClose={() => { setSelectedLog(null); setTranscript(null); }}
        title={selectedLog ? `Transcript — ${selectedLog.caller_name || selectedLog.phone_number}` : ''} maxWidth={720}>
        {selectedLog && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span className="badge badge-neutral">{format(new Date(selectedLog.created_at), 'MMM d, yyyy h:mm a')}</span>
              <span className="badge badge-neutral">{fmtDuration(selectedLog.duration_seconds)}</span>
              <StatusBadge status={selectedLog.was_booked ? 'ok' : 'neutral'} label={selectedLog.was_booked ? 'Booked' : 'No booking'} />
            </div>
            {selectedLog.summary && (
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                {selectedLog.summary}
              </p>
            )}
            {selectedLog.latency_summary && (
              <div className="latency-bar" style={{ marginBottom: 16 }}>
                <span className="latency-chip">⚡ {Math.round(selectedLog.latency_summary.total_turn_ms)}ms avg</span>
                <span className="latency-chip">🤖 LLM {Math.round(selectedLog.latency_summary.llm_first_token_ms)}ms</span>
                <span className="latency-chip">🔊 TTS {Math.round(selectedLog.latency_summary.tts_first_audio_ms)}ms</span>
                <span className="latency-chip">📚 KB {Math.round(selectedLog.latency_summary.kb_ms)}ms</span>
                <span className="latency-chip">🗣 {selectedLog.latency_summary.turns} turns</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={copyTranscript} disabled={!transcript}><Copy size={13} /> Copy</button>
              <button className="btn btn-secondary btn-sm" onClick={downloadTranscript} disabled={!transcript}><Download size={13} /> Download</button>
            </div>
            {transcriptLoading ? <LoadingSpinner label="Fetching transcript…" /> :
              <pre className="transcript-pre">{transcript || 'No transcript available.'}</pre>}
          </>
        )}
      </Modal>
    </div>
  );
}
