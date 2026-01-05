'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell } from 'lucide-react'
import NotificationList from '@/components/communication/notifications/NotificationList'

export default function NotificationsPage() {
  return (
    <div className="space-y-6 p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-primary rounded-lg">
          <Bell className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recent Updates</h1>
          <p className="text-muted-foreground">Stay informed about your tickets and account</p>
        </div>
      </div>
      
      {/* Content */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationList />
        </CardContent>
      </Card>
    </div>
  )
}