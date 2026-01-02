'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Top Portals</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {portals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No portals found</p>
            </div>
          ) : (
            portals.map((portal, index) => (
              <div key={portal.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                    <span className="text-sm font-bold text-primary">#{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{portal.name}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
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
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <Upload className="h-3 w-3" />
                    <span>{portal.uploadCount}</span>
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}