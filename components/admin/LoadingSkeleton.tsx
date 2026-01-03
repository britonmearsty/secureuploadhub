'use client';

export function LoadingSkeleton({ 
  rows = 5, 
  columns = 4 
}: { 
  rows?: number; 
  columns?: number;
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="flex-1 h-16 bg-slate-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-slate-200">
        <div className="h-4 bg-slate-200 rounded w-24 animate-pulse" />
        <div className="h-4 bg-slate-200 rounded w-32 animate-pulse" />
        <div className="h-4 bg-slate-200 rounded w-24 animate-pulse" />
        <div className="h-4 bg-slate-200 rounded w-32 animate-pulse" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-4 py-3">
          <div className="h-4 bg-slate-200 rounded w-24 animate-pulse" />
          <div className="h-4 bg-slate-200 rounded w-32 animate-pulse" />
          <div className="h-4 bg-slate-200 rounded w-24 animate-pulse" />
          <div className="h-4 bg-slate-200 rounded w-32 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-lg border border-slate-200 p-6"
        >
          <div className="h-4 bg-slate-200 rounded w-24 mb-4 animate-pulse" />
          <div className="h-8 bg-slate-200 rounded w-32 mb-2 animate-pulse" />
          <div className="h-3 bg-slate-200 rounded w-20 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

