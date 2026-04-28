import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Settings, ChevronDown, ChevronUp, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchConfig, saveConfig } from '../api/config';
import type { Config } from '../api/types';
import { getErrorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import SecretInput from '../components/SecretInput';

type Section = {
  key: string;
  label: string;
  icon: string;
  fields: FieldDef[];
};

type FieldDef = {
  key: keyof Config;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'secret' | 'select';
  hint?: string;
  options?: string[];
};

const SECTIONS: Section[] = [
  {
    key: 'agent',
    label: 'Agent Greeting & Instructions',
    icon: '💬',
    fields: [
      { key: 'first_line', label: 'First Line (Greeting)', type: 'textarea', hint: 'What the agent says when the call starts.' },
      { key: 'agent_instructions', label: 'Agent Instructions', type: 'textarea', hint: 'System prompt context for the agent.' },
    ],
  },
  {
    key: 'gemini',
    label: 'Gemini Live Runtime',
    icon: '⚡',
    fields: [
      { key: 'gemini_live_model', label: 'Live Model', type: 'text' },
      { key: 'gemini_live_voice', label: 'Voice', type: 'select', options: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'] },
      { key: 'gemini_live_temperature', label: 'Temperature', type: 'number', hint: '0.0–2.0' },
      { key: 'gemini_live_language', label: 'Language Code', type: 'text', hint: 'Leave empty for auto-detect.' },
      { key: 'gemini_tts_model', label: 'TTS Fallback Model', type: 'text' },
      { key: 'lang_preset', label: 'Language Preset', type: 'select', options: ['multilingual', 'hindi', 'english', 'telugu'] },
    ],
  },
  {
    key: 'preflight',
    label: 'Preflight & Connect Settings',
    icon: '🔄',
    fields: [
      { key: 'gemini_live_preflight_enabled', label: 'Preflight Enabled', type: 'boolean' },
      { key: 'gemini_live_preflight_timeout', label: 'Preflight Timeout (s)', type: 'number' },
      { key: 'gemini_live_connect_timeout', label: 'Connect Timeout (s)', type: 'number' },
      { key: 'gemini_live_connect_retries', label: 'Connect Retries', type: 'number' },
    ],
  },
  {
    key: 'session',
    label: 'Session & Turn Settings',
    icon: '⏱',
    fields: [
      { key: 'max_turns', label: 'Max Turns', type: 'number' },
      { key: 'user_away_timeout', label: 'User Away Timeout (s)', type: 'number' },
      { key: 'session_close_transcript_timeout', label: 'Transcript Close Timeout (s)', type: 'number' },
    ],
  },
  {
    key: 'livekit',
    label: 'LiveKit / SIP',
    icon: '📡',
    fields: [
      { key: 'livekit_url', label: 'LiveKit URL', type: 'text', hint: 'wss://your-project.livekit.cloud' },
      { key: 'livekit_api_key', label: 'API Key', type: 'text' },
      { key: 'livekit_api_secret', label: 'API Secret', type: 'secret' },
      { key: 'sip_trunk_id', label: 'SIP Trunk ID', type: 'text' },
    ],
  },
  {
    key: 'google',
    label: 'Google API',
    icon: '🔑',
    fields: [
      { key: 'google_api_key', label: 'Google API Key', type: 'secret' },
    ],
  },
  {
    key: 'supabase',
    label: 'Supabase',
    icon: '🗄',
    fields: [
      { key: 'supabase_url', label: 'Supabase URL', type: 'text' },
      { key: 'supabase_key', label: 'Supabase Key', type: 'secret' },
    ],
  },
  {
    key: 'telegram',
    label: 'Telegram Notifications',
    icon: '📨',
    fields: [
      { key: 'telegram_bot_token', label: 'Bot Token', type: 'secret' },
      { key: 'telegram_chat_id', label: 'Chat ID', type: 'text' },
    ],
  },
  {
    key: 'kb',
    label: 'Knowledge Base',
    icon: '📚',
    fields: [
      { key: 'kb_enabled', label: 'KB Enabled', type: 'boolean' },
      { key: 'kb_backend', label: 'Backend', type: 'select', options: ['local_faiss', 'supabase'] },
      { key: 'kb_data_dir', label: 'Data Directory', type: 'text' },
      { key: 'kb_top_k', label: 'Top K Results', type: 'number' },
      { key: 'kb_inventory_top_k', label: 'Inventory Top K', type: 'number' },
      { key: 'kb_similarity_threshold', label: 'Similarity Threshold', type: 'number', hint: '0.0–1.0' },
      { key: 'kb_context_char_budget', label: 'Context Char Budget', type: 'number' },
      { key: 'kb_live_timeout_ms', label: 'Live Timeout (ms)', type: 'number' },
      { key: 'kb_live_context_char_budget', label: 'Live Context Char Budget', type: 'number' },
      { key: 'kb_cache_ttl_seconds', label: 'Cache TTL (s)', type: 'number' },
      { key: 'kb_chunk_size', label: 'Chunk Size', type: 'number' },
      { key: 'kb_chunk_overlap', label: 'Chunk Overlap', type: 'number' },
      { key: 'kb_worker_poll_seconds', label: 'Worker Poll (s)', type: 'number' },
      { key: 'kb_embedding_provider', label: 'Embedding Provider', type: 'select', options: ['local', 'gemini'] },
      { key: 'kb_embedding_model', label: 'Embedding Model', type: 'text' },
      { key: 'kb_embedding_fallback_provider', label: 'Fallback Provider', type: 'select', options: ['local', 'gemini'] },
      { key: 'kb_embedding_fallback_model', label: 'Fallback Model', type: 'text' },
      { key: 'kb_index_kind', label: 'Index Kind', type: 'select', options: ['flat_ip', 'flat_l2', 'ivf_flat'] },
      { key: 'kb_rerank_enabled', label: 'Rerank Enabled', type: 'boolean' },
    ],
  },
  {
    key: 'leadrat',
    label: 'LeadRat CRM Integration',
    icon: '🏢',
    fields: [
      { key: 'leadrat_enabled', label: 'LeadRat Enabled', type: 'boolean' },
      { key: 'leadrat_tenant', label: 'Tenant', type: 'text' },
      { key: 'leadrat_api_key', label: 'API Key', type: 'secret' },
      { key: 'leadrat_secret_key', label: 'Secret Key', type: 'secret' },
      { key: 'leadrat_sync_interval_minutes', label: 'Sync Interval (min)', type: 'number' },
      { key: 'leadrat_base_url', label: 'Base URL', type: 'text' },
    ],
  },
];

export default function Configuration() {
  const { data: remote, isLoading, error } = useQuery({
    queryKey: ['config'],
    queryFn: fetchConfig,
  });

  const [local, setLocal] = useState<Partial<Config>>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['agent', 'gemini']));
  const [dirty, setDirty] = useState(false);

  const supabaseUrl = String(local.supabase_url ?? '');
  const supabasePlaceholder =
    !supabaseUrl ||
    supabaseUrl.includes('your-project-ref') ||
    supabaseUrl.includes('example.supabase.co') ||
    supabaseUrl === 'https://your-project-ref.supabase.co';

  useEffect(() => {
    if (remote) {
      setLocal(remote);
      setDirty(false);
      // Auto-expand Supabase section when placeholder URL is detected
      const url = String(remote.supabase_url ?? '');
      if (!url || url.includes('your-project-ref') || url.includes('example.supabase.co')) {
        setOpenSections((prev) => new Set([...prev, 'supabase']));
      }
    }
  }, [remote]);

  const mutation = useMutation({
    mutationFn: () => saveConfig(local),
    onSuccess: () => {
      toast.success('Configuration saved.');
      setDirty(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function setValue<K extends keyof Config>(key: K, value: Config[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  if (isLoading) return <div className="page-content"><LoadingSpinner label="Loading configuration…" /></div>;
  if (error) return (
    <div className="page-content">
      <div className="inline-alert error">Could not load configuration from backend: {getErrorMessage(error)}</div>
    </div>
  );

  return (
    <div className="page-content">
      <PageHeader
        title="Configuration"
        description="Edit and save backend agent settings."
        icon={Settings}
        actions={
          <button
            className="btn btn-primary"
            onClick={() => mutation.mutate()}
            disabled={!dirty || mutation.isPending}
          >
            <Save size={15} />
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        }
      />

      {supabasePlaceholder && (
        <div className="inline-alert warn" style={{ marginBottom: 20, alignItems: 'flex-start' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Supabase is not configured</div>
            <div style={{ fontSize: 13 }}>
              The <strong>Supabase URL</strong> is still a placeholder. Call logs, contacts, and appointments all
              require a real Supabase project. Open the <strong>Supabase</strong> section below and set your
              project URL and key, then save.
            </div>
          </div>
        </div>
      )}

      {dirty && (
        <div className="inline-alert warn" style={{ marginBottom: 20 }}>
          You have unsaved changes.
        </div>
      )}

      {SECTIONS.map((section) => {
        const isOpen = openSections.has(section.key);
        return (
          <div key={section.key} className="config-section">
            <button
              className="config-section-header"
              onClick={() => toggleSection(section.key)}
              aria-expanded={isOpen}
            >
              <span style={{ fontSize: 16 }}>{section.icon}</span>
              <span className="config-section-title">{section.label}</span>
              {isOpen ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
            </button>

            {isOpen && (
              <div
                className="config-section-body"
                style={{
                  gridTemplateColumns: section.fields.some(
                    (f) => f.type === 'textarea',
                  )
                    ? '1fr'
                    : 'repeat(auto-fit, minmax(260px, 1fr))',
                }}
              >
                {section.fields.map((field) => (
                  <FieldControl
                    key={field.key}
                    field={field}
                    value={local[field.key]}
                    onChange={(v) => setValue(field.key, v as Config[typeof field.key])}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `cfg-${field.key}`;

  if (field.type === 'boolean') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
        <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          {field.label}
        </label>
        <label className="toggle-switch">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="toggle-slider" />
        </label>
      </div>
    );
  }

  if (field.type === 'secret') {
    return (
      <div>
        <label className="form-label" htmlFor={id}>{field.label}</label>
        <SecretInput
          id={id}
          value={String(value ?? '')}
          onChange={(v) => onChange(v)}
        />
        {field.hint && <p className="form-hint">{field.hint}</p>}
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="form-label" htmlFor={id}>{field.label}</label>
        <textarea
          id={id}
          className="form-input"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          style={{ minHeight: 100 }}
        />
        {field.hint && <p className="form-hint">{field.hint}</p>}
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div>
        <label className="form-label" htmlFor={id}>{field.label}</label>
        <select
          id={id}
          className="form-input"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {field.hint && <p className="form-hint">{field.hint}</p>}
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div>
        <label className="form-label" htmlFor={id}>{field.label}</label>
        <input
          id={id}
          type="number"
          className="form-input"
          value={value as number ?? 0}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          step="any"
        />
        {field.hint && <p className="form-hint">{field.hint}</p>}
      </div>
    );
  }

  return (
    <div>
      <label className="form-label" htmlFor={id}>{field.label}</label>
      <input
        id={id}
        type="text"
        className="form-input"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.hint && <p className="form-hint">{field.hint}</p>}
    </div>
  );
}
