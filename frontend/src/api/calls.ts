import { apiFetch } from './client';
import type { SingleCallResult, BulkCallResult } from './types';

export const dispatchSingleCall = (phone: string, callerName?: string) =>
  apiFetch<SingleCallResult>('/api/call/single', {
    method: 'POST',
    body: JSON.stringify({ phone, caller_name: callerName ?? '' }),
  });

export const dispatchBulkCall = (numbers: string[]) =>
  apiFetch<BulkCallResult>('/api/call/bulk', {
    method: 'POST',
    body: JSON.stringify({ numbers }),
  });
