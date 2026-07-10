import { Injectable } from '@nestjs/common';
import * as winston from 'winston';

// [ADAPTIVE] Logger reads configuration from environment variables
// [PERFECTIVO] Emits structured JSON logs with level, timestampISO, route, action, productId, message
@Injectable()
export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    const level = process.env.LOG_LEVEL || 'info';
    const transports: winston.transport[] = [new winston.transports.Console()];

    if (process.env.LOG_FILE) {
      transports.push(
        new winston.transports.File({ filename: process.env.LOG_FILE }),
      );
    }

    this.logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp({ format: () => new Date().toISOString() }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          // Emit fully structured JSON with standard fields at the top level
          return JSON.stringify({
            level,
            timestampISO: timestamp,
            message,
            ...meta,
          });
        }),
      ),
      transports,
      exitOnError: false,
    });
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.logger.error(message, meta);
  }
}
