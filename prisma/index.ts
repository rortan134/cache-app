import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, type Prisma } from "./client/client";

const globalForPrisma = global as unknown as {
    baseClient: PrismaClient;
};

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString,
    idleTimeoutMillis: 300_000,
    max: 10,
});

const adapter = new PrismaPg(pool);

const prismaOptions: Prisma.PrismaClientOptions = {
    adapter,
};

const baseClient =
    globalForPrisma.baseClient || new PrismaClient(prismaOptions);

export const prisma = baseClient; /** .extends() goes here */

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.baseClient = baseClient;
}
