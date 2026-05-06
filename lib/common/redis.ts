import { NamedError } from "@/lib/common/error";
import { createLogger } from "@/lib/common/logs/console/logger";
import { RedisClient } from "bun";
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

// Global Redis client for singleton reuse
// Bun's client manages connections, auto-pipelines, and reconnects automatically.
let globalRedisClient: RedisClient | null = null;

/**
 * Get a Redis client instance.
 * Returns null in browser environments or when Redis is not configured.
 */
export function getRedisClient(): RedisClient | null {
    // SSR-safe: return null on the client side
    if (typeof window !== "undefined") {
        return null;
    }

    if (globalRedisClient) {
        return globalRedisClient;
    }

    try {
        // Explicitly require REDIS_URL in production to avoid accidental localhost connections
        const url =
            process.env.REDIS_URL ||
            (process.env.NODE_ENV === "development"
                ? "redis://localhost:6379"
                : undefined);

        if (!url) {
            log.warn("Redis disabled: no REDIS_URL configured");
            return null;
        }

        globalRedisClient = new RedisClient(url);

        globalRedisClient.onconnect = () => {
            log.info("Redis connection established");
        };

        globalRedisClient.onclose = (error) => {
            if (error) {
                log.error("Redis connection closed with error", { error });
            } else {
                log.warn("Redis connection closed");
            }
        };

        return globalRedisClient;
    } catch (error) {
        log.error("Failed to initialize Redis client", { error });
        return null;
    }
}

/**
 * Close the Redis connection.
 * Important for proper cleanup in serverless environments.
 */
export function closeRedisConnection(): void {
    if (!globalRedisClient) {
        return;
    }

    try {
        globalRedisClient.close();
    } catch (error) {
        log.error("Error closing Redis connection", { error });
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
