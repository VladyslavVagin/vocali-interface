import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PaginationProps } from '../types/pagination'

const Pagination: React.FC<PaginationProps> = ({
  pagination,
  currentPage,
  onPageChange,
  showItemCount = true,
  itemLabel = 'files'
}) => {
  if (pagination.totalPages <= 1) {
    return null
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5

    if (pagination.totalPages <= maxVisiblePages) {
      // Show all pages if total is 5 or less
      for (let i = 1; i <= pagination.totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show smart pagination with ellipsis
      if (currentPage <= 3) {
        // Show first 5 pages
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
      } else if (currentPage >= pagination.totalPages - 2) {
        // Show last 5 pages
        for (let i = pagination.totalPages - 4; i <= pagination.totalPages; i++) {
          pages.push(i)
        }
      } else {
        // Show current page with 2 pages on each side
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i)
        }
      }
    }

    return pages
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {showItemCount && (
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.totalItems)} of {pagination.totalItems} {itemLabel}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!pagination.hasPreviousPage}
          className={`p-2 rounded-lg transition-colors ${
            pagination.hasPreviousPage
              ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              : 'text-gray-400 cursor-not-allowed'
          }`}
          title="Previous page"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-1">
          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === pageNum
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!pagination.hasNextPage}
          className={`p-2 rounded-lg transition-colors ${
            pagination.hasNextPage
              ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              : 'text-gray-400 cursor-not-allowed'
          }`}
          title="Next page"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export default Pagination 