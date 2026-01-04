'use client';

import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { BarChart3, User, Upload } from 'lucide-react';

interface Portal {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  uploadCount: number;
  createdAt: string;
}

interface TopPortalsProps {
  portals: Portal[];
}

export function TopPortals({ portals }: TopPortalsProps) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-slate-400" />
          <span>Top Portals</span>
        </h3>
      </div>
      <div className="space-y-4">
        {portals.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No portals found</p>
          </div>
        ) : (
          portals.map((portal, index) => (
            <div key={portal.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full">
                  <span className="text-sm font-bold">#{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-slate-900">{portal.name}</p>
                  <div className="flex items-center space-x-4 text-xs text-slate-600">
                    <span className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{portal.ownerName || 'Anonymous'}</span>
                    </span>
                    <span>
                      Created {formatDistanceToNow(new Date(portal.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="flex items-center space-x-1 bg-slate-200 text-slate-700">
                  <Upload className="h-3 w-3" />
                  <span>{portal.uploadCount}</span>
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}