import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import { format } from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

// Helper function to safely convert value to string
const safeStringify = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  // At this point, value must be a primitive (number, boolean, symbol, bigint, etc.)
  // Use explicit type checks to avoid ESLint error
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    typeof value === 'symbol'
  ) {
    return String(value);
  }
  // Fallback for any other type
  return JSON.stringify(value);
};

// Custom format for console output
const consoleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.colorize({ all: true }),
  format.printf((info) => {
    const { timestamp, level, message, context, trace, ...meta } = info;
    const timestampStr = safeStringify(timestamp);
    const levelStr = safeStringify(level);
    const messageStr = safeStringify(message);

    let log = `${timestampStr} [${levelStr}]`;

    if (context) {
      const contextStr =
        typeof context === 'string' ? context : JSON.stringify(context);
      log += ` [${contextStr}]`;
    }

    log += ` ${messageStr}`;

    // Add stack trace if available
    if (trace) {
      const traceStr =
        typeof trace === 'string' ? trace : JSON.stringify(trace);
      log += `\n${traceStr}`;
    }

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  }),
);

// JSON format for production (better for log aggregation)
const jsonFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json(),
);

// File format (plain text with timestamp)
const fileFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf((info) => {
    const { timestamp, level, message, context, trace, ...meta } = info;
    const timestampStr = safeStringify(timestamp);
    const levelStr = safeStringify(level);
    const messageStr = safeStringify(message);

    let log = `${timestampStr} [${levelStr}]`;

    if (context) {
      const contextStr =
        typeof context === 'string' ? context : JSON.stringify(context);
      log += ` [${contextStr}]`;
    }

    log += ` ${messageStr}`;

    if (trace) {
      const traceStr =
        typeof trace === 'string' ? trace : JSON.stringify(trace);
      log += `\n${traceStr}`;
    }

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  }),
);

// Build transports array based on environment
const transports: winston.transport[] = [
  // Console transport (always enabled) - CloudWatch logs will capture this
  new winston.transports.Console({
    format: nodeEnv === 'production' ? jsonFormat : consoleFormat,
  }),
];

// Only add file transports in development (not in production/containerized environments)
// In production, CloudWatch logs capture console output
if (nodeEnv === 'development') {
  transports.push(
    // Error log file (only errors)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file (all levels)
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  );
}

// Exception and rejection handlers
const exceptionHandlers: winston.transport[] = [];
const rejectionHandlers: winston.transport[] = [];

// Only add file handlers in development
if (nodeEnv === 'development') {
  exceptionHandlers.push(
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      format: fileFormat,
    }),
  );
  rejectionHandlers.push(
    new winston.transports.File({
      filename: 'logs/rejections.log',
      format: fileFormat,
    }),
  );
} else {
  // In production, log exceptions/rejections to console (CloudWatch will capture)
  exceptionHandlers.push(
    new winston.transports.Console({
      format: jsonFormat,
    }),
  );
  rejectionHandlers.push(
    new winston.transports.Console({
      format: jsonFormat,
    }),
  );
}

export const winstonConfig: WinstonModuleOptions = {
  level: logLevel,
  format: nodeEnv === 'production' ? jsonFormat : consoleFormat,
  defaultMeta: {
    service: 'bsp-api',
    environment: nodeEnv,
  },
  transports,
  exceptionHandlers,
  rejectionHandlers,
};
