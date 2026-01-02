'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Recent Uploads</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {uploads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent uploads</p>
            </div>
          ) : (
            uploads.map((upload) => (
              <div key={upload.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium truncate">{upload.fileName}</p>
                    <Badge variant="secondary" className="text-xs">
                      {formatBytes(upload.fileSize)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
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
                <div className="text-xs text-muted-foreground ml-2">
                  {formatDistanceToNow(new Date(upload.createdAt), { addSuffix: true })}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}