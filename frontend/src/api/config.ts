import { apiFetch } from './client';
import type { Config } from './types';

export const fetchConfig = () =>
  apiFetch<Config>('/api/config');

export const saveConfig = (config: Partial<Config>) =>
  apiFetch<{ status: string; config: Config }>('/api/config', {
    method: 'POST',
    body: JSON.stringify(config),
  });
