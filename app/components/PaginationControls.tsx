interface PaginationControlsProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ totalPages, currentPage, onPageChange }: PaginationControlsProps) {
  return (
    <div className="flex justify-center gap-2 mt-3">
      <button
        className="btn btn-sm text-xs"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>
      <span className="flex items-center px-3 text-xs">
        Page {currentPage} of {totalPages}
      </span>
      <button
        className="btn btn-sm text-xs"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
} 