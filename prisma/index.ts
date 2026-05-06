import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./client/client";

const SSL_MODE_ALIASES_REQUIRING_HOSTNAME_VERIFICATION = new Set([
    "prefer",
    "require",
    "verify-ca",
]);

const globalForPrisma = global as unknown as {
    baseClient: PrismaClient;
};

const databaseUrl = process.env.DATABASE_URL;
const parsedDatabaseUrl =
    typeof databaseUrl === "string" ? new URL(databaseUrl) : null;
const sslMode = parsedDatabaseUrl?.searchParams.get("sslmode");

if (
    parsedDatabaseUrl &&
    sslMode &&
    SSL_MODE_ALIASES_REQUIRING_HOSTNAME_VERIFICATION.has(sslMode.toLowerCase())
) {
    parsedDatabaseUrl.searchParams.set("sslmode", "verify-full");
}

const adapter = new PrismaPg({
    connectionString: parsedDatabaseUrl?.href ?? databaseUrl,
});

const prismaOptions = {
    adapter,
};

const baseClient =
    globalForPrisma.baseClient || new PrismaClient(prismaOptions);

export const prisma = baseClient; /** .extends() goes here */

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.baseClient = baseClient;
}
