import { NamedError } from "@/lib/common/error";
import { createLogger } from "@/lib/common/logs/console/logger";
import { createClient } from "redis";
import type { RedisClientType } from "redis";
import * as z from "zod";

const log = createLogger("Redis");

const RedisConnectionError = NamedError.create(
    "RedisConnectionError",
    z.object({
        cause: z.instanceof(Error).optional(),
        message: z.string(),
        operation: z.string(),
    })
);
export type RedisConnectionError = InstanceType<typeof RedisConnectionError>;

let globalRedisClient: RedisClientType | null = null;

/**
 * Get a Redis client instance.
 * Returns null in browser environments or when Redis is not configured.
 * The client auto-reconnects on disconnection.
 */
export function getRedisClient(): RedisClientType | null {
    if (typeof window !== "undefined") {
        return null;
    }

    if (globalRedisClient) {
        return globalRedisClient;
    }

    try {
        const url =
            process.env.REDIS_URL ||
            (process.env.NODE_ENV === "development"
                ? "redis://localhost:6379"
                : undefined);

        if (!url) {
            log.warn("Redis disabled: no REDIS_URL configured");
            return null;
        }

        globalRedisClient = createClient({ url });

        globalRedisClient.on("error", (error) => {
            log.error("Redis client error", { error });
        });

        globalRedisClient.on("connect", () => {
            log.info("Redis connection established");
        });

        globalRedisClient.on("end", () => {
            log.warn("Redis connection closed");
        });

        globalRedisClient.on("reconnecting", () => {
            log.debug("Redis reconnecting");
        });

        // Kick off connect eagerly so the client is ready by the first data request.
        globalRedisClient.connect().catch((error) => {
            log.error("Redis initial connect failed", { error });
        });

        return globalRedisClient;
    } catch (error) {
        log.error("Failed to initialize Redis client", { error });
        return null;
    }
}

/**
 * Close the Redis connection gracefully.
 * Important for proper cleanup in serverless environments.
 */
export async function closeRedisConnection(): Promise<void> {
    if (!globalRedisClient) {
        return;
    }

    try {
        await globalRedisClient.quit();
    } catch (error) {
        log.error("Error closing Redis connection gracefully", { error });
        await globalRedisClient.destroy();
    } finally {
        globalRedisClient = null;
    }
}

/**
 * Perform a health check on the Redis connection.
 * Throws a RedisConnectionError if the client is unavailable or unresponsive.
 */
export async function healthCheck(): Promise<void> {
    const redis = getRedisClient();

    if (!redis) {
        throw new RedisConnectionError({
            message: "Redis client is not available",
            operation: "healthCheck",
        });
    }

    try {
        await redis.ping();
    } catch (error) {
        throw new RedisConnectionError({
            cause: error instanceof Error ? error : undefined,
            message: "Redis ping failed",
            operation: "healthCheck",
        });
    }
}
