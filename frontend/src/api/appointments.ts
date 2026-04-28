import { apiFetch } from './client';
import type { Appointment, AppointmentFormData } from './types';

export const fetchAppointments = (params?: { start?: string; end?: string }) => {
  const qs = new URLSearchParams();
  if (params?.start) qs.set('start', params.start);
  if (params?.end) qs.set('end', params.end);
  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch<Appointment[]>(`/api/appointments${query}`);
};

export const createAppointment = (data: AppointmentFormData) =>
  apiFetch<{ status: string; appointment: Appointment }>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateAppointment = (id: string, data: Partial<AppointmentFormData>) =>
  apiFetch<{ status: string; appointment: Appointment }>(`/api/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const cancelAppointment = (id: string, reason?: string) =>
  apiFetch<{ status: string; appointment: Appointment }>(`/api/appointments/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? '' }),
  });
