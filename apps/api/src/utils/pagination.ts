import type { Paginated, PaginationMeta } from '@vrp/shared-types';

export interface PageRequest {
  page: number;
  limit: number;
}

export const toSkip = ({ page, limit }: PageRequest): number => (page - 1) * limit;

export function buildPagination({ page, limit }: PageRequest, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export function paginate<T>(items: T[], request: PageRequest, total: number): Paginated<T> {
  return { items, pagination: buildPagination(request, total) };
}
