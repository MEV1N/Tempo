import { prisma as realPrisma } from '@tempo/database';
import { mockDb } from './services/mockDb';

export const isMockDb = process.env.MOCK_DB === 'true';

export const prisma = isMockDb ? (mockDb.prismaMock as any) : realPrisma;
