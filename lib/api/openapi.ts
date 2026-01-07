/**
 * OpenAPI Specification for SecureUploadHub API v1
 * Provides consistent API documentation and validation
 */

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "SecureUploadHub API",
    version: "1.0.0",
    description: "Consolidated API for SecureUploadHub file upload and storage management",
    contact: {
      name: "SecureUploadHub Support",
      email: "support@secureuploadhub.com"
    }
  },
  servers: [
    {
      url: "/api/v1",
      description: "API v1"
    }
  ],
  paths: {
    "/storage": {
      get: {
        summary: "Get storage accounts",
        description: "Retrieve all storage accounts and their connection status for the authenticated user",
        tags: ["Storage"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Storage accounts retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    accounts: {
                      type: "array",
                      items: { $ref: "#/components/schemas/StorageAccount" }
                    },
                    activeStorageAccounts: {
                      type: "array",
                      items: { $ref: "#/components/schemas/StorageAccount" }
                    },
                    fallbackInfo: {
                      type: "object",
                      properties: {
                        accountsCreated: { type: "number" },
                        accountsReactivated: { type: "number" },
                        accountsValidated: { type: "number" },
                        errors: { type: "array", items: { type: "string" } }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          500: { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/storage/disconnect": {
      post: {
        summary: "Disconnect storage provider",
        description: "Disconnect a storage provider while preserving OAuth login capability",
        tags: ["Storage"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["provider"],
                properties: {
                  provider: {
                    type: "string",
                    enum: ["google", "dropbox"],
                    description: "Storage provider to disconnect"
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Storage provider disconnected successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    affectedPortals: { type: "number" },
                    deactivatedPortals: { type: "number" },
                    storageDisconnected: { type: "boolean" },
                    authPreserved: { type: "boolean" }
                  }
                }
              }
            }
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          500: { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/storage/health-check": {
      post: {
        summary: "Perform storage health check",
        description: "Check and repair storage account connections",
        tags: ["Storage"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  provider: {
                    type: "string",
                    enum: ["google_drive", "dropbox"],
                    description: "Specific provider to check (optional)"
                  },
                  forceCheck: {
                    type: "boolean",
                    default: false,
                    description: "Force check even if recently checked"
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Health check completed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    checkedAccounts: { type: "number" },
                    createdAccounts: { type: "number" },
                    reactivatedAccounts: { type: "number" },
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          accountId: { type: "string" },
                          provider: { type: "string" },
                          action: { type: "string" },
                          previousStatus: { type: "string", nullable: true },
                          newStatus: { type: "string", nullable: true },
                          error: { type: "string", nullable: true }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          500: { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/uploads": {
      get: {
        summary: "List uploads",
        description: "Retrieve uploads with filtering and pagination",
        tags: ["Uploads"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
            description: "Number of items per page"
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", minimum: 0, default: 0 },
            description: "Number of items to skip"
          },
          {
            name: "portalId",
            in: "query",
            schema: { type: "string" },
            description: "Filter by portal ID"
          },
          {
            name: "clientEmail",
            in: "query",
            schema: { type: "string" },
            description: "Filter by client email"
          },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["pending", "completed", "failed"] },
            description: "Filter by upload status"
          },
          {
            name: "storageProvider",
            in: "query",
            schema: { type: "string", enum: ["google_drive", "dropbox"] },
            description: "Filter by storage provider"
          }
        ],
        responses: {
          200: {
            description: "Uploads retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Upload" }
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" }
                  }
                }
              }
            }
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          422: { $ref: "#/components/responses/ValidationError" },
          500: { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/uploads/{id}": {
      get: {
        summary: "Get upload details",
        description: "Retrieve detailed information about a specific upload",
        tags: ["Uploads"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Upload ID"
          }
        ],
        responses: {
          200: {
            description: "Upload details retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Upload" }
              }
            }
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          500: { $ref: "#/components/responses/InternalError" }
        }
      },
      delete: {
        summary: "Delete upload",
        description: "Delete an upload from both cloud storage and database",
        tags: ["Uploads"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Upload ID"
          }
        ],
        responses: {
          200: {
            description: "Upload deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" }
                  }
                }
              }
            }
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          500: { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/portals": {
      get: {
        summary: "List portals",
        description: "Retrieve portals with filtering and pagination",
        tags: ["Portals"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
            description: "Number of items per page"
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", minimum: 0, default: 0 },
            description: "Number of items to skip"
          },
          {
            name: "isActive",
            in: "query",
            schema: { type: "boolean" },
            description: "Filter by active status"
          },
          {
            name: "storageProvider",
            in: "query",
            schema: { type: "string", enum: ["google_drive", "dropbox"] },
            description: "Filter by storage provider"
          }
        ],
        responses: {
          200: {
            description: "Portals retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Portal" }
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" }
                  }
                }
              }
            }
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          422: { $ref: "#/components/responses/ValidationError" },
          500: { $ref: "#/components/responses/InternalError" }
        }
      },
      post: {
        summary: "Create portal",
        description: "Create a new upload portal",
        tags: ["Portals"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePortalRequest" }
            }
          }
        },
        responses: {
          201: {
            description: "Portal created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Portal" }
              }
            }
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          422: { $ref: "#/components/responses/ValidationError" },
          500: { $ref: "#/components/responses/InternalError" }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      StorageAccount: {
        type: "object",
        properties: {
          id: { type: "string" },
          provider: { type: "string", enum: ["google_drive", "dropbox"] },
          displayName: { type: "string" },
          email: { type: "string", nullable: true },
          status: { type: "string", enum: ["ACTIVE", "INACTIVE", "DISCONNECTED", "ERROR"] },
          isActive: { type: "boolean" },
          lastAccessedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      Upload: {
        type: "object",
        properties: {
          id: { type: "string" },
          fileName: { type: "string" },
          fileSize: { type: "number" },
          mimeType: { type: "string" },
          status: { type: "string" },
          clientName: { type: "string", nullable: true },
          clientEmail: { type: "string", nullable: true },
          storageProvider: { type: "string" },
          storageAccount: { $ref: "#/components/schemas/StorageAccount", nullable: true },
          portal: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              slug: { type: "string" }
            }
          },
          createdAt: { type: "string", format: "date-time" },
          uploadedAt: { type: "string", format: "date-time", nullable: true }
        }
      },
      Portal: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
          description: { type: "string", nullable: true },
          isActive: { type: "boolean" },
          storageProvider: { type: "string" },
          storageAccount: { $ref: "#/components/schemas/StorageAccount", nullable: true },
          _count: {
            type: "object",
            properties: {
              uploads: { type: "number" }
            }
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      CreatePortalRequest: {
        type: "object",
        required: ["name", "slug"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          slug: { type: "string", minLength: 1, maxLength: 100, pattern: "^[a-z0-9-]+$" },
          description: { type: "string", maxLength: 500 },
          primaryColor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$", default: "#4F46E5" },
          logoUrl: { type: "string", format: "uri" },
          requireClientName: { type: "boolean", default: true },
          requireClientEmail: { type: "boolean", default: false },
          storageProvider: { type: "string", enum: ["google_drive", "dropbox"], default: "google_drive" },
          storageFolderId: { type: "string" },
          storageFolderPath: { type: "string" },
          storageAccountId: { type: "string" },
          password: { type: "string", minLength: 4, maxLength: 100 },
          maxFileSize: { type: "number", minimum: 1024, maximum: 5368709120, default: 524288000 },
          allowedFileTypes: { type: "array", items: { type: "string" }, default: [] },
          backgroundImageUrl: { type: "string", format: "uri" },
          backgroundColor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
          cardBackgroundColor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$", default: "#ffffff" },
          textColor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$", default: "#0f172a" },
          welcomeMessage: { type: "string", maxLength: 500 },
          submitButtonText: { type: "string", maxLength: 50, default: "Initialize Transfer" },
          successMessage: { type: "string", maxLength: 200, default: "Transmission Verified" },
          useClientFolders: { type: "boolean", default: false }
        }
      },
      Pagination: {
        type: "object",
        properties: {
          total: { type: "number" },
          page: { type: "number" },
          limit: { type: "number" },
          totalPages: { type: "number" }
        }
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          details: { type: "string" },
          code: { type: "string" }
        }
      },
      ValidationError: {
        type: "object",
        properties: {
          error: { type: "string" },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                message: { type: "string" }
              }
            }
          }
        }
      }
    },
    responses: {
      Unauthorized: {
        description: "Authentication required",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      },
      Forbidden: {
        description: "Access denied",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      },
      BadRequest: {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      },
      ValidationError: {
        description: "Validation failed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" }
          }
        }
      },
      InternalError: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" }
          }
        }
      }
    }
  }
} as const