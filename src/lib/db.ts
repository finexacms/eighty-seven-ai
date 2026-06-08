import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })

// In development, reuse the client to avoid connection pool exhaustion
// In production (Vercel), each serverless function gets its own instance
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
