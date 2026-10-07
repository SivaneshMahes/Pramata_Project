import type { ErrorCode } from './errors.js';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFieldError {
  path: string;
  message: string;
}

export interface ApiErrorBody {
  success: false;
  code: ErrorCode;
  message: string;
  details?: ApiFieldError[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}
