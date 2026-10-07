import type { AxiosError } from 'axios';
import axios from 'axios';
import type { ApiErrorBody, ApiFieldError, ApiSuccess, ErrorCode } from '@vrp/shared-types';

/**
 * Same-origin in every environment: Vite proxies /api in development and
 * CloudFront routes /api/* to the ALB in production, so the session cookie is
 * first-party and no API URL needs to be baked into the bundle.
 */
export const http = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

/** A normalised API failure. Components never see raw Axios errors. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: ErrorCode | 'NETWORK_ERROR',
    public readonly details: ApiFieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const sessionExpiredListeners = new Set<() => void>();
export const onSessionExpired = (listener: () => void) => {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
};

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const body = error.response?.data;
    if (!error.response) {
      return Promise.reject(
        new ApiError(
          'We couldn’t reach the server. Check your connection and try again.',
          0,
          'NETWORK_ERROR',
        ),
      );
    }
    const status = error.response.status;
    if (status === 401 && !error.config?.url?.startsWith('/auth/')) {
      sessionExpiredListeners.forEach((listener) => listener());
    }
    const message =
      body && typeof body === 'object' && 'message' in body
        ? body.message
        : 'Something went wrong. Please try again.';
    const code = body && typeof body === 'object' && 'code' in body ? body.code : 'INTERNAL_ERROR';
    return Promise.reject(new ApiError(message, status, code, body?.details ?? []));
  },
);

/** Unwraps the `{ success, data }` envelope. */
export async function unwrap<T>(request: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  const response = await request;
  return response.data.data;
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}
