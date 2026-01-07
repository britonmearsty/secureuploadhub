/**
 * Consolidated Uploads API
 * Replaces multiple scattered upload endpoints with a single resource-based API
 * 
 * Endpoints consolidated:
 * - GET /api/uploads -> GET /api/v1/uploads
 * - POST /api/upload -> POST /api/v1/uploads
 * - GET /api/uploads/client -> GET /api/v1/uploads?client=true
 */

import { NextRequest } from "next/server"
import { withAuthAndLogging, withQueryValidation, ApiResponse } from "@/lib/api/middleware"
import { schemas } from "@/lib/api/schemas"
import prisma from "@/lib/prisma"

/**
 * GET /api/v1/uploads - List uploads with filtering and pagination
 */
export const GET = withQueryValidation(schemas.query.uploadFilters, 
  withAuthAndLogging('UPLOADS_API')(
    async (request: NextRequest, session: any, query: any) => {
      const { limit = 50, offset = 0, portalId, clientEmail, status, storageProvider } = query

      // Get all portal IDs owned by this user
      const userPortals = await prisma.uploadPortal.findMany({
        where: { userId: session.user.id },
        select: { id: true }
      })

      const portalIds = userPortals.map((p: { id: string }) => p.id)

      if (portalIds.length === 0) {
        return ApiResponse.success({
          data: [],
          pagination: {
            total: 0,
            page: Math.floor(offset / limit) + 1,
            limit,
            totalPages: 0
          }
        })
      }

      // Build where clause with filters
      const whereClause: any = {
        portalId: portalId && portalIds.includes(portalId) 
          ? portalId 
          : { in: portalIds }
      }

      if (clientEmail) {
        whereClause.clientEmail = { contains: clientEmail, mode: 'insensitive' }
      }

      if (status) {
        whereClause.status = status
      }

      if (storageProvider) {
        whereClause.storageProvider = storageProvider
      }

      // Get total count for pagination
      const total = await prisma.fileUpload.count({ where: whereClause })

      // Get uploads with includes
      const uploads = await prisma.fileUpload.findMany({
        where: whereClause,
        include: {
          portal: {
            select: {
              id: true,
              name: true,
              slug: true,
              primaryColor: true,
            }
          },
          storageAccount: {
            select: {
              id: true,
              status: true,
              provider: true,
              displayName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset
      })

      return ApiResponse.success({
        data: uploads,
        pagination: {
          total,
          page: Math.floor(offset / limit) + 1,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      })
    }
  )
)