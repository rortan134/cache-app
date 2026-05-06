import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const databaseUrl = new URL(env("DATABASE_URL"));
const sslMode = databaseUrl.searchParams.get("sslmode");

if (
    sslMode &&
    new Set(["prefer", "require", "verify-ca"]).has(sslMode.toLowerCase())
) {
    databaseUrl.searchParams.set("sslmode", "verify-full");
}

export default defineConfig({
    datasource: { url: databaseUrl.href },
});
