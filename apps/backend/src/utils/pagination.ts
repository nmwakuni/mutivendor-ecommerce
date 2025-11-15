import { config } from '@/config/env';
import { PaginationParams } from '@/types';

export const getPaginationParams = (query: Record<string, unknown>): PaginationParams => {
  const page = Math.max(1, parseInt(String(query.page || 1), 10));
  const pageSize = Math.min(
    Math.max(1, parseInt(String(query.pageSize || config.pagination.defaultPageSize), 10)),
    config.pagination.maxPageSize
  );
  const sortBy = String(query.sortBy || 'createdAt');
  const sortOrder = (query.sortOrder === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  return { page, pageSize, sortBy, sortOrder };
};

export const calculatePagination = (total: number, page: number, pageSize: number) => {
  const totalPages = Math.ceil(total / pageSize);
  const skip = (page - 1) * pageSize;

  return {
    skip,
    take: pageSize,
    meta: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
};
