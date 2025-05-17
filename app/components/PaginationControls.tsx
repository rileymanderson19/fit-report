interface PaginationControlsProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ totalPages, currentPage, onPageChange }: PaginationControlsProps) {
  return (
    <div className="flex justify-center gap-2 mt-4">
      <button
        className="btn btn-sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>
      <span className="flex items-center px-4">
        Page {currentPage} of {totalPages}
      </span>
      <button
        className="btn btn-sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
} 