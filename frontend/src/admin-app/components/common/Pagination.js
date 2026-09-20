import React from 'react';

export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l > 2) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex justify-center items-center gap-2 mt-8 mb-8">
      {currentPage > 1 && (
        <button
          onClick={() => onPageChange(currentPage - 1)}
          className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 font-bold"
        >
          Before
        </button>
      )}

      {pages.map((page, index) => {
        if (page === '...') {
          return (
            <span key={`dots-${index}`} className="px-3 py-2 text-gray-500">
              ...
            </span>
          );
        }
        return (
          <button
            key={`page-${page}`}
            onClick={() => onPageChange(page)}
            className={`px-3 py-2 rounded font-bold ${
              currentPage === page ? 'bg-red-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {page}
          </button>
        );
      })}

      {currentPage < totalPages && (
        <button
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 font-bold"
        >
          Sau
        </button>
      )}
    </div>
  );
};

export default Pagination;
