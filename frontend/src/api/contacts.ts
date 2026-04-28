import { apiFetch } from './client';
import type { Contact } from './types';

export const fetchContacts = () =>
  apiFetch<Contact[]>('/api/contacts');
