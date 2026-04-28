import { apiFetch } from './client';
import type { Stats } from './types';

export const fetchStats = () =>
  apiFetch<Stats>('/api/stats');
