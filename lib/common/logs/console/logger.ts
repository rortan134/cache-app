/** biome-ignore-all lint/suspicious/noExplicitAny: TODO: remove `any` */
import chalk, { type ChalkInstance } from "chalk";

/**
 * Log level constants define the severity levels for logging
 *
 * DEBUG: Detailed information, typically useful only for diagnosing problems
 *        These logs are only shown in development environment
 *
 * INFO: Confirmation that things are working as expected
 *       These logs are shown in both development and production environments
 *
 * WARN: Indication that something unexpected happened, or may happen in the near future
 *       The application can still continue working as expected
 *
 * ERROR: Error events that might still allow the application to continue running
 *        These should be investigated and fixed
 */
const LogLevel = {
    DEBUG: "DEBUG",
    ERROR: "ERROR",
    INFO: "INFO",
    WARN: "WARN",
} as const;

type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

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
        minLevel: LogLevel.DEBUG, // Show all logs in development
    },
    production: {
        colorize: false,
        enabled: false, // Disable all console logs in production
        minLevel: LogLevel.ERROR,
    },
    test: {
        colorize: false,
        enabled: false, // Disable logs in test environment
        minLevel: LogLevel.ERROR,
    },
};

// Get current environment
const ENV = process.env.NODE_ENV || "development";
const config = LOG_CONFIG[ENV] || LOG_CONFIG.development;

const formatObjectForLog = (obj: any): string => {
    try {
        if (obj instanceof Error) {
            return JSON.stringify(
                {
                    message: obj.message,
                    stack: ENV === "development" ? obj.stack : undefined,
                    ...(obj as any),
                },
                null,
                ENV === "development" ? 2 : 0
            );
        }
        return JSON.stringify(obj, null, ENV === "development" ? 2 : 0);
    } catch (_error) {
        return "[Circular or Non-Serializable Object]";
    }
};

/**
 * Logger class for standardized console logging
 *
 * This class provides methods for logging at different severity levels
 * and handles formatting, colorization, and environment-specific behavior.
 */
export class Logger {
    readonly #module: string;

    /**
     * Create a new logger for a specific module
     * @param module The name of the module (e.g., 'OpenAIProvider', 'AgentBlockHandler')
     */
    constructor(module: string) {
        this.#module = module;
    }

    /**
     * Determines if a log at the given level should be displayed
     * based on the current environment configuration
     *
     * @param level The log level to check
     * @returns boolean indicating whether the log should be displayed
     */
    #shouldLog(level: LogLevel): boolean {
        if (!config.enabled) {
            return false;
        }

        const levels = [
            LogLevel.DEBUG,
            LogLevel.INFO,
            LogLevel.WARN,
            LogLevel.ERROR,
        ];
        const minLevelIndex = levels.indexOf(config.minLevel);
        const currentLevelIndex = levels.indexOf(level);

        return currentLevelIndex >= minLevelIndex;
    }

    /**
     * Format arguments for logging, converting objects to JSON strings
     *
     * @param args Arguments to format
     * @returns Formatted arguments
     */
    #formatArgs(args: any[]): any[] {
        return args.map((arg) => {
            if (arg === null || arg === undefined) {
                return arg;
            }
            if (typeof arg === "object") {
                return formatObjectForLog(arg);
            }
            return arg;
        });
    }

    /**
     * Internal method to log a message with the specified level
     *
     * @param level The severity level of the log
     * @param message The main log message
     * @param args Additional arguments to log
     */
    #log(level: LogLevel, message: string, ...args: any[]) {
        if (!this.#shouldLog(level)) {
            return;
        }

        const timestamp = new Date().toISOString();
        const formattedArgs = this.#formatArgs(args);

        // Color configuration
        if (config.colorize) {
            let levelColor: ChalkInstance;
            const moduleColor = chalk.cyan;
            const timestampColor = chalk.gray;

            switch (level) {
                case LogLevel.DEBUG:
                    levelColor = chalk.blue;
                    break;
                case LogLevel.INFO:
                    levelColor = chalk.green;
                    break;
                case LogLevel.WARN:
                    levelColor = chalk.yellow;
                    break;
                case LogLevel.ERROR:
                    levelColor = chalk.red;
                    break;
                default:
                    levelColor = chalk.red;
                    break;
            }

            const coloredPrefix = `${timestampColor(`[${timestamp}]`)} ${levelColor(`[${level}]`)} ${moduleColor(`[${this.#module}]`)}`;

            if (level === LogLevel.ERROR) {
                console.error(coloredPrefix, message, ...formattedArgs);
            } else {
                console.log(coloredPrefix, message, ...formattedArgs);
            }
        } else {
            // No colors in production
            const prefix = `[${timestamp}] [${level}] [${this.#module}]`;

            if (level === LogLevel.ERROR) {
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
     * These logs are only shown in development environment.
     *
     * Examples:
     * - Variable values during execution
     * - Function entry/exit points
     * - Detailed request/response data
     *
     * @param message The message to log
     * @param args Additional arguments to log
     */
    debug(message: string, ...args: any[]) {
        this.#log(LogLevel.DEBUG, message, ...args);
    }

    /**
     * Log an info message
     *
     * Use for general information about application operation.
     * These logs are shown in both development and production environments.
     *
     * Examples:
     * - Application startup/shutdown
     * - Configuration information
     * - Successful operations
     *
     * @param message The message to log
     * @param args Additional arguments to log
     */
    info(message: string, ...args: any[]) {
        this.#log(LogLevel.INFO, message, ...args);
    }

    /**
     * Log a warning message
     *
     * Use for potentially problematic situations that don't cause operation failure.
     *
     * Examples:
     * - Deprecated feature usage
     * - Suboptimal configurations
     * - Recoverable errors
     *
     * @param message The message to log
     * @param args Additional arguments to log
     */
    warn(message: string, ...args: any[]) {
        this.#log(LogLevel.WARN, message, ...args);
    }

    /**
     * Log an error message
     *
     * Use for error events that might still allow the application to continue.
     *
     * Examples:
     * - API call failures
     * - Operation failures
     * - Unexpected exceptions
     *
     * @param message The message to log
     * @param args Additional arguments to log
     */
    error(message: string, ...args: any[]) {
        this.#log(LogLevel.ERROR, message, ...args);
    }

    /**
     * Create a new Logger with the same module configuration.
     * Useful when an independent instance is desired without changing the original.
     */
    clone(): Logger {
        return new Logger(this.#module);
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
    time(message: string, meta: Record<string, unknown> = {}) {
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
        } as { stop: () => void; [Symbol.dispose]: () => void };
    }
}

/**
 * Create a logger for a specific module
 *
 * Usage:
 * ```ts
 * import { createLogger } from '@/lib/logs/console/logger'
 *
 * const logger = createLogger('MyComponent')
 *
 * logger.debug('Initializing component', { props })
 * logger.info('Component mounted')
 * logger.warn('Deprecated prop used', { propName })
 * logger.error('Failed to fetch data', error)
 * ```
 *
 * @param module The name of the module
 * @returns A Logger instance
 */
export function createLogger(module: string): Logger {
    return new Logger(module);
}
