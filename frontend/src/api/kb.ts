import { apiFetch, apiUpload } from './client';
import type {
  KbStatus,
  KbSource,
  KbJob,
  KbSearchResponse,
  InventoryItem,
  LeadRatStatus,
} from './types';

// ─── Status ──────────────────────────────────────────────────────────────────

export const fetchKbStatus = () =>
  apiFetch<KbStatus>('/api/kb/status');

// ─── Sources ─────────────────────────────────────────────────────────────────

export const fetchKbSources = () =>
  apiFetch<{ status: string; items: KbSource[] }>('/api/kb/sources');

export const createKbSource = (data: Partial<KbSource>) =>
  apiFetch<{ status: string; source: KbSource }>('/api/kb/sources', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateKbSource = (id: number, data: Partial<KbSource>) =>
  apiFetch<{ status: string; source: KbSource }>(`/api/kb/sources/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteKbSource = (id: number) =>
  apiFetch<{ status: string; deleted: boolean }>(`/api/kb/sources/${id}`, {
    method: 'DELETE',
  });

export const syncKbSource = (id: number) =>
  apiFetch<{ status: string; job: KbJob }>(`/api/kb/sources/${id}/sync`, {
    method: 'POST',
  });

// ─── Upload ───────────────────────────────────────────────────────────────────

export const uploadKbFile = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return apiUpload<{ status: string; source: KbSource }>('/api/kb/upload', fd);
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const fetchKbJobs = () =>
  apiFetch<{ status: string; items: KbJob[] }>('/api/kb/jobs');

// ─── Search ───────────────────────────────────────────────────────────────────

export const searchKb = (query: string) =>
  apiFetch<KbSearchResponse>('/api/kb/search', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });

export const searchInventory = (query: string) =>
  apiFetch<{ status: string; items: InventoryItem[] }>(
    `/api/kb/inventory/search?query=${encodeURIComponent(query)}`,
  );

// ─── LeadRat ──────────────────────────────────────────────────────────────────

export const fetchLeadRatStatus = () =>
  apiFetch<LeadRatStatus>('/api/kb/integrations/leadrat/status');

export const connectLeadRat = () =>
  apiFetch<{ status: string; result: unknown }>('/api/kb/integrations/leadrat/connect', {
    method: 'POST',
  });

export const syncLeadRat = () =>
  apiFetch<{ status: string; result: unknown }>('/api/kb/integrations/leadrat/sync', {
    method: 'POST',
  });
