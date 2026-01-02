import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  format: z.enum(['csv', 'json']).optional().default('csv'),
  type: z.enum(['dashboard', 'users', 'uploads', 'all']).optional().default('all'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { period, format, type } = querySchema.parse({
      period: searchParams.get('period'),
      format: searchParams.get('format'),
      type: searchParams.get('type'),
    });

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    let exportData: any = {};

    // Fetch data based on type
    if (type === 'dashboard' || type === 'all') {
      const [totalUsers, totalPortals, totalUploads, newUsers, newPortals, newUploads] = await Promise.all([
        prisma.user.count(),
        prisma.uploadPortal.count(),
        prisma.fileUpload.count(),
        prisma.user.count({ where: { createdAt: { gte: startDate } } }),
        prisma.uploadPortal.count({ where: { createdAt: { gte: startDate } } }),
        prisma.fileUpload.count({ where: { createdAt: { gte: startDate } } }),
      ]);

      exportData.dashboard = {
        totalUsers,
        totalPortals,
        totalUploads,
        newUsers,
        newPortals,
        newUploads,
        period,
        exportedAt: new Date().toISOString(),
      };
    }

    if (type === 'users' || type === 'all') {
      const users = await prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              uploadPortals: true,
              fileUploads: true,
              sessions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      exportData.users = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        portalCount: user._count.uploadPortals,
        uploadCount: user._count.fileUploads,
        sessionCount: user._count.sessions,
      }));
    }

    if (type === 'uploads' || type === 'all') {
      const uploads = await prisma.fileUpload.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          clientName: true,
          clientEmail: true,
          status: true,
          createdAt: true,
          portal: {
            select: {
              name: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      exportData.uploads = uploads.map(upload => ({
        id: upload.id,
        fileName: upload.fileName,
        fileSize: upload.fileSize,
        fileSizeGB: Math.round((upload.fileSize / (1024 * 1024 * 1024)) * 1000) / 1000,
        mimeType: upload.mimeType,
        clientName: upload.clientName,
        clientEmail: upload.clientEmail,
        status: upload.status,
        createdAt: upload.createdAt.toISOString(),
        portalName: upload.portal.name,
        portalOwnerName: upload.portal.user.name,
        portalOwnerEmail: upload.portal.user.email,
      }));
    }

    if (format === 'json') {
      return NextResponse.json(exportData, {
        headers: {
          'Content-Disposition': `attachment; filename="analytics-${type}-${period}-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

    // Convert to CSV format
    const csvData = convertToCSV(exportData, type);
    
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="analytics-${type}-${period}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Analytics export error:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 }
    );
  }
}

function convertToCSV(data: any, type: string): string {
  let csv = '';

  if (type === 'dashboard' || type === 'all') {
    if (data.dashboard) {
      csv += 'Dashboard Summary\n';
      csv += 'Metric,Value\n';
      csv += `Total Users,${data.dashboard.totalUsers}\n`;
      csv += `Total Portals,${data.dashboard.totalPortals}\n`;
      csv += `Total Uploads,${data.dashboard.totalUploads}\n`;
      csv += `New Users (${data.dashboard.period}),${data.dashboard.newUsers}\n`;
      csv += `New Portals (${data.dashboard.period}),${data.dashboard.newPortals}\n`;
      csv += `New Uploads (${data.dashboard.period}),${data.dashboard.newUploads}\n`;
      csv += `Exported At,${data.dashboard.exportedAt}\n\n`;
    }
  }

  if (type === 'users' || type === 'all') {
    if (data.users && data.users.length > 0) {
      csv += 'Users Data\n';
      csv += 'ID,Email,Name,Role,Status,Created At,Portal Count,Upload Count,Session Count\n';
      data.users.forEach((user: any) => {
        csv += `${user.id},"${user.email}","${user.name || ''}",${user.role},${user.status},${user.createdAt},${user.portalCount},${user.uploadCount},${user.sessionCount}\n`;
      });
      csv += '\n';
    }
  }

  if (type === 'uploads' || type === 'all') {
    if (data.uploads && data.uploads.length > 0) {
      csv += 'Uploads Data\n';
      csv += 'ID,File Name,File Size (bytes),File Size (GB),MIME Type,Client Name,Client Email,Status,Created At,Portal Name,Portal Owner Name,Portal Owner Email\n';
      data.uploads.forEach((upload: any) => {
        csv += `${upload.id},"${upload.fileName}",${upload.fileSize},${upload.fileSizeGB},"${upload.mimeType}","${upload.clientName || ''}","${upload.clientEmail || ''}",${upload.status},${upload.createdAt},"${upload.portalName}","${upload.portalOwnerName}","${upload.portalOwnerEmail}"\n`;
      });
    }
  }

  return csv;
}