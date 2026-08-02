import { Button } from "./Button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: PaginationProps) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-500">
          {totalItems === 0
            ? "Kayıt bulunamadı"
            : `${start}–${end} / ${totalItems} kayıt`}
        </p>
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-sm text-slate-500">
            Sayfa başına
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Önceki
        </Button>
        <span className="min-w-[5.5rem] text-center text-sm tabular-nums text-slate-600">
          {totalPages === 0 ? 0 : currentPage} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages || totalPages === 0}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Sonraki
        </Button>
      </div>
    </div>
  );
}
