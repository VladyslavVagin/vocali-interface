interface PaginationInfo {
    page: number
    limit: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  
 export interface PaginationProps {
    pagination: PaginationInfo
    currentPage: number
    onPageChange: (page: number) => void
    showItemCount?: boolean
    itemLabel?: string
  }