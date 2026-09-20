import React from 'react';

export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
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
        } else if (i - l !== 1) {
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
    <div className="flex justify-center items-center gap-1 mt-12 mb-12 select-none">
      {/* Previous Button */}
      <button
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${
          currentPage === 1 
            ? 'border-gray-100 text-gray-300 cursor-not-allowed' 
            : 'border-gray-200 text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50'
        }`}
        title="Previous page"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1 mx-2">
        {pages.map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="w-10 h-10 flex items-center justify-center text-gray-400 font-bold">
                {page}
              </span>
            ) : (
              <button
                onClick={() => onPageChange(page)}
                className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm transition-all ${
                  currentPage === page
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-2 ring-blue-100'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
                }`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Next Button */}
      <button
        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${
          currentPage === totalPages 
            ? 'border-gray-100 text-gray-300 cursor-not-allowed' 
            : 'border-gray-200 text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50'
        }`}
        title="Trang sau"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default Pagination;
