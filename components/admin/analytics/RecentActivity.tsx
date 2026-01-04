'use client';

import { Badge } from '@/components/ui/badge';
import { formatBytes } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Upload, User } from 'lucide-react';

interface Upload {
  id: string;
  fileName: string;
  fileSize: number;
  portalName: string;
  clientName: string;
  createdAt: string;
}

interface RecentActivityProps {
  uploads: Upload[];
}

export function RecentActivity({ uploads }: RecentActivityProps) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
          <Upload className="h-5 w-5 text-slate-400" />
          <span>Recent Uploads</span>
        </h3>
      </div>
      <div className="space-y-4">
        {uploads.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent uploads</p>
          </div>
        ) : (
          uploads.map((upload) => (
            <div key={upload.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="text-sm font-medium truncate text-slate-900">{upload.fileName}</p>
                  <Badge variant="secondary" className="text-xs bg-slate-200 text-slate-700">
                    {formatBytes(upload.fileSize)}
                  </Badge>
                </div>
                <div className="flex items-center space-x-4 text-xs text-slate-600">
                  <span className="flex items-center space-x-1">
                    <Upload className="h-3 w-3" />
                    <span>{upload.portalName}</span>
                  </span>
                  {upload.clientName && (
                    <span className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{upload.clientName}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-500 ml-2">
                {formatDistanceToNow(new Date(upload.createdAt), { addSuffix: true })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}