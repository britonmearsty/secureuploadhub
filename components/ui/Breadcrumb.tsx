"use client"

import { ChevronRight, Home, Folder } from "lucide-react"

interface BreadcrumbItem {
  id: string
  name: string
  path: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  onItemClick: (item: BreadcrumbItem, index: number) => void
  className?: string
  maxItems?: number
}

export default function Breadcrumb({ 
  items, 
  onItemClick, 
  className = "",
  maxItems = 5 
}: BreadcrumbProps) {
  // Show ellipsis if there are too many items
  const shouldShowEllipsis = items.length > maxItems
  const visibleItems = shouldShowEllipsis 
    ? [items[0], ...items.slice(-(maxItems - 1))]
    : items

  return (
    <nav className={`flex items-center space-x-1 text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {visibleItems.map((item, index) => {
          const isFirst = index === 0
          const isLast = index === visibleItems.length - 1
          const actualIndex = shouldShowEllipsis && index > 0 
            ? items.length - (visibleItems.length - index)
            : index

          return (
            <li key={item.id} className="flex items-center">
              {/* Show ellipsis after first item if needed */}
              {shouldShowEllipsis && index === 1 && (
                <>
                  <span className="mx-2 text-muted-foreground">...</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
                </>
              )}

              <button
                type="button"
                onClick={() => onItemClick(item, actualIndex)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all hover:bg-muted ${
                  isLast 
                    ? "text-foreground font-medium cursor-default" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                disabled={isLast}
              >
                {isFirst ? (
                  <Home className="w-4 h-4" />
                ) : (
                  <Folder className="w-4 h-4" />
                )}
                <span className="truncate max-w-[120px]" title={item.name}>
                  {item.name}
                </span>
              </button>

              {!isLast && (
                <ChevronRight className="w-4 h-4 text-muted-foreground mx-1 flex-shrink-0" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}