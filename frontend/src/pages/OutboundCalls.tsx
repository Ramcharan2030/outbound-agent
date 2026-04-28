import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PhoneOutgoing, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { dispatchSingleCall, dispatchBulkCall } from '../api/calls';
import type { BulkCallResultItem } from '../api/types';
import { getErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';

function validatePhone(phone: string): boolean {
  return /^\+\d{7,15}$/.test(phone.trim());
}

export default function OutboundCalls() {
  const location = useLocation();
  const prefill = location.state as { phone?: string; name?: string } | null;

  const [tab, setTab] = useState<'single' | 'bulk'>('single');

  // Single call state
  const [sPhone, setSPhone] = useState(prefill?.phone ?? '');
  const [sName, setSName] = useState(prefill?.name ?? '');
  const [sResult, setSResult] = useState<{ status: string; dispatch_id?: string; room?: string; message?: string } | null>(null);
  const [sErr, setSErr] = useState('');

  useEffect(() => {
    if (prefill?.phone) setSPhone(prefill.phone);
    if (prefill?.name) setSName(prefill.name);
  }, [prefill]);

  const singleMut = useMutation({
    mutationFn: () => dispatchSingleCall(sPhone.trim(), sName.trim()),
    onSuccess: (data) => {
      setSResult(data);
      if (data.status === 'ok') toast.success(`Call dispatched to ${sPhone}`);
      else toast.error(data.message ?? 'Dispatch failed.');
    },
    onError: (e) => { setSErr(getErrorMessage(e)); toast.error(getErrorMessage(e)); },
  });

  // Bulk call state
  const [bText, setBText] = useState('');
  const [bResults, setBResults] = useState<BulkCallResultItem[] | null>(null);
  const [bErr, setBErr] = useState('');

  const bulkMut = useMutation({
    mutationFn: () => {
      const numbers = bText.split('\n').map((n) => n.trim()).filter(Boolean);
      return dispatchBulkCall(numbers);
    },
    onSuccess: (data) => {
      setBResults(data.results);
      const ok = data.results.filter((r) => r.status === 'ok').length;
      toast.success(`${ok}/${data.total} calls dispatched.`);
    },
    onError: (e) => { setBErr(getErrorMessage(e)); toast.error(getErrorMessage(e)); },
  });

  function validateSingle(): boolean {
    if (!sPhone.trim()) { setSErr('Phone number is required.'); return false; }
    if (!validatePhone(sPhone)) { setSErr('Enter a valid international number (e.g. +919999999999).'); return false; }
    return true;
  }

  function validateBulk(): boolean {
    const numbers = bText.split('\n').map((n) => n.trim()).filter(Boolean);
    if (numbers.length === 0) { setBErr('Enter at least one phone number.'); return false; }
    const invalid = numbers.filter((n) => !validatePhone(n));
    if (invalid.length > 0) { setBErr(`Invalid numbers: ${invalid.join(', ')}`); return false; }
    return true;
  }

  return (
    <div className="page-content">
      <PageHeader title="Outbound Calls" description="Dispatch single or bulk outbound calls via LiveKit SIP." icon={PhoneOutgoing} />

      <div className="tabs" style={{ marginBottom: 24, width: 'fit-content' }}>
        <button className={`tab ${tab === 'single' ? 'active' : ''}`} onClick={() => setTab('single')}>Single Call</button>
        <button className={`tab ${tab === 'bulk' ? 'active' : ''}`} onClick={() => setTab('bulk')}>Bulk Call</button>
      </div>

      {tab === 'single' && (
        <div style={{ maxWidth: 480 }}>
          <div className="card">
            <p className="section-title" style={{ marginBottom: 16 }}>Dispatch a Single Call</p>
            {sErr && <div className="inline-alert error" style={{ marginBottom: 14 }}>{sErr}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label" htmlFor="single-phone">Phone Number *</label>
                <input id="single-phone" className="form-input" value={sPhone} onChange={(e) => { setSPhone(e.target.value); setSErr(''); setSResult(null); }} placeholder="+919999999999" />
                <p className="form-hint">Use full international format with country code.</p>
              </div>
              <div>
                <label className="form-label" htmlFor="single-name">Caller Name (optional)</label>
                <input id="single-name" className="form-input" value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Asha" />
              </div>
              <button
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => { if (validateSingle()) singleMut.mutate(); }}
                disabled={singleMut.isPending}
                id="dispatch-single-btn"
              >
                <PhoneOutgoing size={15} />
                {singleMut.isPending ? 'Dispatching…' : 'Dispatch Call'}
              </button>
            </div>

            {sResult && (
              <div style={{ marginTop: 20 }}>
                <div className={`inline-alert ${sResult.status === 'ok' ? 'success' : 'error'}`}>
                  {sResult.status === 'ok' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  <div>
                    <div style={{ fontWeight: 600 }}>{sResult.status === 'ok' ? 'Call dispatched' : 'Dispatch failed'}</div>
                    {sResult.status === 'ok' ? (
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        <div>Dispatch ID: <code>{sResult.dispatch_id}</code></div>
                        <div>Room: <code>{sResult.room}</code></div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, marginTop: 4 }}>{sResult.message}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'bulk' && (
        <div style={{ maxWidth: 600 }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <p className="section-title" style={{ marginBottom: 16 }}>Dispatch Bulk Calls</p>
            {bErr && <div className="inline-alert error" style={{ marginBottom: 14 }}>{bErr}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label" htmlFor="bulk-numbers">Phone Numbers *</label>
                <textarea
                  id="bulk-numbers"
                  className="form-input"
                  value={bText}
                  onChange={(e) => { setBText(e.target.value); setBErr(''); setBResults(null); }}
                  placeholder={'+919999999999\n+918888888888\n+917777777777'}
                  style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 13 }}
                />
                <p className="form-hint">One international number per line.</p>
              </div>
              <button
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => { if (validateBulk()) bulkMut.mutate(); }}
                disabled={bulkMut.isPending}
                id="dispatch-bulk-btn"
              >
                <PhoneOutgoing size={15} />
                {bulkMut.isPending ? 'Dispatching…' : 'Dispatch All'}
              </button>
            </div>
          </div>

          {bResults && (
            <div>
              <p className="section-title" style={{ marginBottom: 12 }}>
                Results — {bResults.filter((r) => r.status === 'ok').length}/{bResults.length} dispatched
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bResults.map((r, i) => (
                  <div key={i} className="dispatch-result">
                    {r.status === 'ok' ? (
                      <CheckCircle size={16} color="var(--status-success)" style={{ flexShrink: 0 }} />
                    ) : (
                      <XCircle size={16} color="var(--status-error)" style={{ flexShrink: 0 }} />
                    )}
                    <span style={{ fontFamily: 'monospace', fontSize: 13, flex: 1 }}>{r.phone}</span>
                    {r.status === 'ok' ? (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {r.dispatch_id}</span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--status-error)' }}>{r.message}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
