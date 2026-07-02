import { formatLogValue } from "@/lib/common/logs/format";

/**
 *
 * Framework-agnostic logging utilities for the platform.
 * Provides standardized console logging with environment-aware configuration.
 */

/**
 * LogLevel enum defines the severity levels for logging
 *
 * DEBUG: Detailed information, typically useful only for diagnosing problems
 * INFO: Confirmation that things are working as expected
 * WARN: Indication that something unexpected happened
 * ERROR: Error events that might still allow the application to continue running
 */
const LOG_LEVEL = {
    DEBUG: "DEBUG",
    ERROR: "ERROR",
    INFO: "INFO",
    WARN: "WARN",
} as const;

type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];

/**
 * Configuration for different environments
 *
 * enabled: Whether logging is enabled at all
 * minLevel: The minimum log level that will be displayed
 *          (e.g., INFO will show INFO, WARN, and ERROR, but not DEBUG)
 * colorize: Whether to apply color formatting to logs
 */
const LOG_CONFIG = {
    development: {
        colorize: true,
        enabled: true,
        minLevel: LOG_LEVEL.DEBUG,
    },
    production: {
        colorize: false,
        enabled: false,
        minLevel: LOG_LEVEL.ERROR,
    },
    test: {
        colorize: false,
        enabled: false,
        minLevel: LOG_LEVEL.ERROR,
    },
};

const LOG_LEVEL_ORDER = [
    LOG_LEVEL.DEBUG,
    LOG_LEVEL.INFO,
    LOG_LEVEL.WARN,
    LOG_LEVEL.ERROR,
];
const ANSI_RESET = "\u001b[0m";
const ANSI_COLOR_BY_LEVEL: Record<LogLevel, string> = {
    DEBUG: "\u001b[34m",
    ERROR: "\u001b[31m",
    INFO: "\u001b[32m",
    WARN: "\u001b[33m",
};
const ANSI_CYAN = "\u001b[36m";
const ANSI_GRAY = "\u001b[90m";

interface LogSpan {
    stop: () => void;
    [Symbol.dispose]: () => void;
}

const getNodeEnv = (): string => {
    if (typeof process !== "undefined" && process.env) {
        return process.env.NODE_ENV || "development";
    }
    return "development";
};

/**
 * Configuration for different environments
 */
function getLogConfig() {
    const nodeEnv = getNodeEnv();
    switch (nodeEnv) {
        case "production":
            return LOG_CONFIG.production;
        case "test":
            return LOG_CONFIG.test;
        default:
            return LOG_CONFIG.development;
    }
}

function colorizeLogPart(value: string, color: string): string {
    return `${color}${value}${ANSI_RESET}`;
}

function stringifyLogValue(value: unknown): string {
    try {
        const nodeEnv = getNodeEnv();
        return JSON.stringify(
            formatLogValue(value, {
                includeErrorStack: nodeEnv === "development",
            }),
            null,
            nodeEnv === "development" ? 2 : 0
        );
    } catch {
        return "[Circular or Non-Serializable Object]";
    }
}

/**
 * Logger class for standardized console logging
 *
 * Provides methods for logging at different severity levels
 * and handles formatting, colorization, and environment-specific behavior.
 */
export class Logger {
    readonly #module: string;

    /**
     * Create a new logger for a specific module
     * @param module The name of the module (e.g., 'OpenAIProvider', 'AgentBlockHandler')
     * @param overrideConfig Optional configuration overrides
     */
    constructor(module: string) {
        this.#module = module;
    }

    #shouldLog(level: LogLevel, config = getLogConfig()): boolean {
        if (!config.enabled) {
            return false;
        }

        const minLevelIndex = LOG_LEVEL_ORDER.indexOf(config.minLevel);
        const currentLevelIndex = LOG_LEVEL_ORDER.indexOf(level);

        return currentLevelIndex >= minLevelIndex;
    }

    /**
     * Format arguments for logging, converting objects to JSON strings
     */
    #formatArgs(args: unknown[]): unknown[] {
        return args.map((arg) => {
            if (arg === null || arg === undefined) {
                return arg;
            }
            if (typeof arg === "object") {
                return stringifyLogValue(arg);
            }
            return arg;
        });
    }

    /**
     * Internal method to log a message with the specified level
     */
    #log(level: LogLevel, message: string, ...args: unknown[]) {
        const config = getLogConfig();
        if (!this.#shouldLog(level, config)) {
            return;
        }

        const timestamp = new Date().toISOString();
        const formattedArgs = this.#formatArgs(args);

        if (config.colorize) {
            const coloredPrefix = `${colorizeLogPart(`[${timestamp}]`, ANSI_GRAY)} ${colorizeLogPart(`[${level}]`, ANSI_COLOR_BY_LEVEL[level])} ${colorizeLogPart(`[${this.#module}]`, ANSI_CYAN)}`;

            if (level === LOG_LEVEL.ERROR) {
                console.error(coloredPrefix, message, ...formattedArgs);
            } else {
                console.log(coloredPrefix, message, ...formattedArgs);
            }
        } else {
            const prefix = `[${timestamp}] [${level}] [${this.#module}]`;

            if (level === LOG_LEVEL.ERROR) {
                console.error(prefix, message, ...formattedArgs);
            } else {
                console.log(prefix, message, ...formattedArgs);
            }
        }
    }

    /**
     * Log a debug message
     *
     * Use for detailed information useful during development and debugging.
     * These logs are only shown in development environment by default.
     */
    debug(message: string, ...args: unknown[]) {
        this.#log(LOG_LEVEL.DEBUG, message, ...args);
    }

    /**
     * Log an info message
     *
     * Use for general information about application operation.
     */
    info(message: string, ...args: unknown[]) {
        this.#log(LOG_LEVEL.INFO, message, ...args);
    }

    /**
     * Log a warning message
     *
     * Use for potentially problematic situations that don't cause operation failure.
     */
    warn(message: string, ...args: unknown[]) {
        this.#log(LOG_LEVEL.WARN, message, ...args);
    }

    /**
     * Log an error message
     *
     * Use for error events that might still allow the application to continue.
     */
    error(message: string, ...args: unknown[]) {
        this.#log(LOG_LEVEL.ERROR, message, ...args);
    }

    /**
     * Measure and log the duration of an operation.
     * Logs a started event immediately and a completed event with duration on stop.
     *
     * Usage:
     * const span = logger.time("sync invoices", { tenantId })
     * try { ... } finally { span.stop() }
     *
     * With TS 5.2+ you can also use `using` to auto-dispose:
     * using _ = logger.time("sync invoices", { tenantId })
     */
    time(message: string, meta: Record<string, unknown> = {}): LogSpan {
        const start = Date.now();
        this.info(message, { status: "started", ...meta });
        const stop = () => {
            this.info(message, {
                durationMs: Date.now() - start,
                status: "completed",
                ...meta,
            });
        };
        return {
            stop,
            [Symbol.dispose]: stop,
        };
    }
}

/**
 * Create a logger for a specific module
 *
 * @example
 * ```ts
 * import { createLogger } from '@/lib/common/logs/console/logger'
 *
 * const log = createLogger('MyComponent')
 *
 * log.debug('Initializing component', { props })
 * log.info('Component mounted')
 * log.warn('Deprecated prop used', { propName })
 * log.error('Failed to fetch data', error)
 * ```
 *
 * @param module The name of the module
 * @returns A Logger instance
 */
export function createLogger(module: string): Logger {
    return new Logger(module);
}
