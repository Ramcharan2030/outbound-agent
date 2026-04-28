// ─── API Types derived from docs/backend-contract.md ──────────────────────

export interface Stats {
  total_calls: number;
  total_bookings: number;
  avg_duration: number;
  booking_rate: number;
}

export interface LatencySlowestTurn {
  turn_index: number;
  total_turn_ms: number;
  kb_used: boolean;
  kb_skipped_reason: string | null;
}

export interface LatencySummary {
  turns: number;
  kb_used_turns: number;
  kb_ms: number;
  llm_first_token_ms: number;
  tts_first_audio_ms: number;
  tool_ms: number;
  total_turn_ms: number;
  slowest_turn: LatencySlowestTurn;
}

export interface CallLog {
  id: string;
  created_at: string;
  phone_number: string;
  caller_name: string;
  duration_seconds: number;
  summary: string;
  transcript?: string;
  recording_url?: string;
  sentiment: string;
  was_booked: boolean;
  interrupt_count: number;
  estimated_cost_usd: number;
  call_date: string;
  call_hour: number;
  call_day_of_week: string;
  call_room_id: string;
  latency_summary?: LatencySummary;
}

export interface Contact {
  phone_number: string;
  caller_name: string;
  total_calls: number;
  last_seen: string;
  is_booked: boolean;
  appointment_count: number;
}

export type AppointmentStatus = 'scheduled' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  contact_name: string;
  contact_phone: string;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  status: AppointmentStatus;
  notes: string;
  source: string;
}

export interface AppointmentFormData {
  title: string;
  contact_name: string;
  contact_phone: string;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  status: AppointmentStatus;
  notes: string;
}

// ─── Knowledge Base ─────────────────────────────────────────────────────────

export type KbSourceType = 'web_url' | 'pdf_upload' | 'text_note' | 'leadrat_crm';
export type KbSourceStatus = 'pending' | 'ready' | 'error' | 'ingesting';

export interface KbSource {
  id: number;
  created_at: string;
  updated_at: string;
  source_type: KbSourceType;
  title: string;
  source_url?: string;
  raw_text?: string;
  storage_bucket?: string;
  storage_path?: string;
  mime_type?: string;
  checksum?: string;
  status: KbSourceStatus;
  enabled: boolean;
  sync_error?: string;
  last_synced_at?: string;
  metadata: Record<string, unknown>;
}

export interface KbJob {
  id: number;
  created_at: string;
  updated_at: string;
  source_id: number;
  source_type: KbSourceType;
  job_type: string;
  status: string;
  payload: Record<string, unknown>;
  last_result: Record<string, unknown>;
}

export interface KbIndexStatus {
  vector_count: number;
  rebuilt_at: string;
}

export interface LeadRatInfo {
  enabled: boolean;
  tenant: string;
  sync_interval_minutes: number;
  source: KbSource | null;
  connected: boolean;
  last_sync: string | null;
  records: number;
}

export interface KbStatus {
  status: string;
  kb_enabled: boolean;
  backend: string;
  runtime: string;
  embedding_provider: string;
  embedding_model: string;
  index_kind: string;
  data_dir: string;
  index_status: KbIndexStatus;
  vector_count: number;
  last_rebuild_at: string;
  counts: {
    sources: number;
    jobs: number;
    entities: number;
    chunks: number;
  };
  leadrat: LeadRatInfo;
}

export interface KbChunkHit {
  score: number;
  title: string;
  content: string;
  preview: string;
  source_type: string;
  source_url?: string;
  entity_type: string | null;
}

export interface KbSearchResult {
  query: string;
  inventory_hits: InventoryItem[];
  chunk_hits: KbChunkHit[];
}

export interface KbSearchResponse {
  status: string;
  result: KbSearchResult;
  grounding: {
    query: string;
    inventory_hits: InventoryItem[];
    chunk_hits: KbChunkHit[];
    grounding_text: string;
  };
}

export interface InventoryItem {
  score: number;
  entity_type: string;
  title: string;
  serial_no?: string;
  project_name?: string;
  status?: string;
  location_text?: string;
  bhk_text?: string;
  price_text?: string;
  possession_text?: string;
  fact_block?: string;
  source: string;
  last_synced_at?: string;
}

export interface LeadRatStatus {
  status: string;
  integration: Partial<LeadRatInfo>;
  message?: string;
}

// ─── Outbound Calls ──────────────────────────────────────────────────────────

export interface SingleCallResult {
  status: 'ok' | 'error';
  dispatch_id?: string;
  room?: string;
  phone?: string;
  sip_trunk_id?: string;
  message?: string;
}

export interface BulkCallResultItem {
  phone: string;
  status: 'ok' | 'error';
  dispatch_id?: string;
  room?: string;
  message?: string;
}

export interface BulkCallResult {
  results: BulkCallResultItem[];
  total: number;
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface Config {
  first_line: string;
  agent_instructions: string;
  gemini_live_model: string;
  gemini_live_voice: string;
  gemini_live_temperature: number;
  gemini_live_language: string;
  gemini_live_preflight_enabled: boolean;
  gemini_live_preflight_timeout: number;
  gemini_live_connect_timeout: number;
  gemini_live_connect_retries: number;
  gemini_tts_model: string;
  lang_preset: string;
  max_turns: number;
  user_away_timeout: number;
  session_close_transcript_timeout: number;
  livekit_url: string;
  livekit_api_key: string;
  livekit_api_secret: string;
  sip_trunk_id: string;
  google_api_key: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
  supabase_url: string;
  supabase_key: string;
  kb_enabled: boolean;
  kb_backend: string;
  kb_data_dir: string;
  kb_top_k: number;
  kb_inventory_top_k: number;
  kb_similarity_threshold: number;
  kb_context_char_budget: number;
  kb_live_timeout_ms: number;
  kb_live_context_char_budget: number;
  kb_cache_ttl_seconds: number;
  kb_chunk_size: number;
  kb_chunk_overlap: number;
  kb_worker_poll_seconds: number;
  kb_embedding_provider: string;
  kb_embedding_model: string;
  kb_embedding_fallback_provider: string;
  kb_embedding_fallback_model: string;
  kb_index_kind: string;
  kb_rerank_enabled: boolean;
  leadrat_enabled: boolean;
  leadrat_tenant: string;
  leadrat_api_key: string;
  leadrat_secret_key: string;
  leadrat_sync_interval_minutes: number;
  leadrat_base_url: string;
}

// ─── Generic API responses ────────────────────────────────────────────────────

export interface ApiError {
  status: 'error';
  message: string;
}

export interface HealthResponse {
  status: string;
  [key: string]: unknown;
}
