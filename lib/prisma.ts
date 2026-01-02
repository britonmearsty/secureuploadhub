import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  // During build time (especially on Vercel), DATABASE_URL might be missing.
  // We return a client without an adapter if no URL is present to avoid crashing
  // during the build process for pages that don't actually need the DB at build time.
  if (!connectionString) {
    return new PrismaClient({} as any);
  }

  const adapter = new PrismaPg({
    connectionString: connectionString,
  })
  return new PrismaClient({ adapter })
}

const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma