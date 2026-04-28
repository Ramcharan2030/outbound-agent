import { apiFetch } from './client';
import type { CallLog } from './types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export const fetchLogs = () =>
  apiFetch<CallLog[]>('/api/logs');

export async function fetchTranscript(logId: string): Promise<string> {
  const url = `${BASE}/api/logs/${logId}/transcript`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}
