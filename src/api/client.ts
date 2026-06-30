const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiEnvelope<T> {
  data: T;
  error?: { code: string; message: string };
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const body = (await res.json()) as ApiEnvelope<T> & { error?: { code: string; message: string } };

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body.error?.code ?? 'REQUEST_FAILED',
      body.error?.message ?? res.statusText,
    );
  }

  return body.data;
}

export function getApiBaseUrl(): string {
  return API_BASE;
}
