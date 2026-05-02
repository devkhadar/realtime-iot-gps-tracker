import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Optional: Log errors via Winston
// @ts-ignore
prisma.$on('error', (e: any) => {
  logger.error('Prisma Error:', e);
});

// @ts-ignore
prisma.$on('warn', (e: any) => {
  logger.warn('Prisma Warning:', e);
});

export default prisma;
