interface SAPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  canNext: boolean;
  canPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onPageSizeChange?: (size: number) => void;
}

export const SAPagination = ({
  page, totalPages, totalItems, pageSize,
  canNext, canPrev, onNext, onPrev, onPageSizeChange,
}: SAPaginationProps) => {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="sa-pagination">
      <div className="sa-pagination-info">
        {start}-{end} sur {totalItems} element{totalItems > 1 ? 's' : ''}
      </div>
      <div className="sa-pagination-controls">
        {onPageSizeChange && (
          <select
            className="sa-pagination-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {[10, 25, 50].map(size => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        )}
        <button
          className="sa-btn sa-btn-secondary"
          onClick={onPrev}
          disabled={!canPrev}
          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
        >
          Précédent
        </button>
        <span className="sa-pagination-current">
          {page} / {totalPages}
        </span>
        <button
          className="sa-btn sa-btn-secondary"
          onClick={onNext}
          disabled={!canNext}
          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
        >
          Suivant
        </button>
      </div>
    </div>
  );
};
