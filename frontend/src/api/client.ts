// Base fetch wrapper — reads VITE_API_BASE_URL at runtime

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseResponse(res: Response) {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    ...init,
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    const message =
      (typeof data === 'object' && data !== null && 'message' in data
        ? (data as { message: string }).message
        : null) ??
      (typeof data === 'string' ? data : null) ??
      `HTTP ${res.status}`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    // No Content-Type — browser sets multipart boundary automatically
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    const message =
      (typeof data === 'object' && data !== null && 'message' in data
        ? (data as { message: string }).message
        : null) ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}
