import { useState, useMemo } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

interface UsePaginationReturn<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  paginatedData: T[];
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  canNext: boolean;
  canPrev: boolean;
}

export function usePagination<T>(
  data: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const { initialPage = 1, initialPageSize = 10 } = options;
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const safePage = Math.min(page, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize]);

  const canNext = safePage < totalPages;
  const canPrev = safePage > 1;

  return {
    page: safePage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData,
    setPage: (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    setPageSize: (size: number) => { setPageSize(size); setPage(1); },
    nextPage: () => canNext && setPage(safePage + 1),
    prevPage: () => canPrev && setPage(safePage - 1),
    goToFirst: () => setPage(1),
    goToLast: () => setPage(totalPages),
    canNext,
    canPrev,
  };
}
