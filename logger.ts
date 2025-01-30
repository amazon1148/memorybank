/**
 * Logger module for Memory Bank Status tool
 * @module logger
 */

/**
 * Available log levels in order of increasing verbosity
 */
export enum LogLevel {
	/** Critical errors that prevent operation */
	ERROR = 0,
	/** Non-fatal issues or concerning conditions */
	WARN = 1,
	/** Standard operational information */
	INFO = 2,
	/** Detailed information for troubleshooting */
	DEBUG = 3,
	/** Most verbose level for deep debugging */
	TRACE = 4,
}

/**
 * Metadata that can be attached to log messages
 */
export interface LogMeta {
	[key: string]: unknown
}

/**
 * Configuration options for the logger
 */
export interface LoggerOptions {
	/** Minimum log level to output */
	level: LogLevel
	/** Whether to output logs in JSON format */
	json: boolean
}

/**
 * Logger class that handles output formatting and filtering
 */
export class Logger {
	private level: LogLevel
	private json: boolean

	constructor(options: LoggerOptions) {
		this.level = options.level
		this.json = options.json
	}

	/**
	 * Log an error message
	 * @param message - The error message
	 * @param meta - Optional metadata to include
	 */
	error(message: string, meta?: LogMeta): void {
		this.log(LogLevel.ERROR, message, meta)
	}

	/**
	 * Log a warning message
	 * @param message - The warning message
	 * @param meta - Optional metadata to include
	 */
	warn(message: string, meta?: LogMeta): void {
		this.log(LogLevel.WARN, message, meta)
	}

	/**
	 * Log an info message
	 * @param message - The info message
	 * @param meta - Optional metadata to include
	 */
	info(message: string, meta?: LogMeta): void {
		this.log(LogLevel.INFO, message, meta)
	}

	/**
	 * Log a debug message
	 * @param message - The debug message
	 * @param meta - Optional metadata to include
	 */
	debug(message: string, meta?: LogMeta): void {
		this.log(LogLevel.DEBUG, message, meta)
	}

	/**
	 * Log a trace message
	 * @param message - The trace message
	 * @param meta - Optional metadata to include
	 */
	trace(message: string, meta?: LogMeta): void {
		this.log(LogLevel.TRACE, message, meta)
	}

	private log(level: LogLevel, message: string, meta?: LogMeta): void {
		if (level > this.level) return

		const timestamp = new Date().toISOString()
		const levelName = LogLevel[level]

		if (this.json) {
			console.log(
				JSON.stringify({
					timestamp,
					level: levelName,
					message,
					...meta,
				}),
			)
		} else {
			const metaStr = meta ? ` ${JSON.stringify(meta)}` : ""
			console.log(`${timestamp} [${levelName}] ${message}${metaStr}`)
		}
	}
}

/**
 * Parse command line arguments to determine log level and format
 * @param argv - Command line arguments array
 * @returns Logger options based on arguments
 */
function parseLoggerOptions(argv: string[]): LoggerOptions {
	const options: LoggerOptions = {
		level: LogLevel.INFO,
		json: false,
	}

	if (argv.includes("--verbose")) {
		options.level = LogLevel.DEBUG
	}

	if (argv.includes("--quiet")) {
		options.level = LogLevel.ERROR
	}

	if (argv.includes("--json")) {
		options.json = true
	}

	return options
}

/**
 * Create a logger instance with options from command line arguments
 * @param argv - Command line arguments array
 * @returns Configured logger instance
 */
export function createLogger(argv: string[]): Logger {
	return new Logger(parseLoggerOptions(argv))
}
