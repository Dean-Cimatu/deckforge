// In production the Vite build replaces VITE_API_BASE with the absolute API URL.
// In local dev it falls back to '/api', which the Vite dev proxy forwards to :3001.
const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit & { rawBody?: BodyInit }): Promise<T> {
  const isFormData = init?.rawBody instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    body: init?.rawBody ?? init?.body,
    headers: isFormData
      ? init?.headers
      : { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse failure
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    body instanceof FormData
      ? request<T>(path, { method: 'POST', rawBody: body })
      : request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
