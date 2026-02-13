interface PaginationControlsProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (_page: number) => void;
}

export function PaginationControls({ totalPages, currentPage, onPageChange }: PaginationControlsProps) {
  return (
    <div className="flex justify-center gap-2 mt-3">
      <button
        className="btn-ghost px-3 py-1.5 rounded-lg text-sm font-medium"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>
      <span className="flex items-center px-3 text-xs">
        Page {currentPage} of {totalPages}
      </span>
      <button
        className="btn-ghost px-3 py-1.5 rounded-lg text-sm font-medium"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
}
