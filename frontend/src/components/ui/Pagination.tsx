interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-sm text-slate-500">
        {totalItems === 0
          ? "Kayıt bulunamadı"
          : `${start}-${end} / ${totalItems} kayıt gösteriliyor`}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-soft transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Önceki
        </button>
        <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200/80">
          Sayfa {totalPages === 0 ? 0 : currentPage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages || totalPages === 0}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-soft transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sonraki
        </button>
      </div>
    </div>
  );
}
