type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogPayload {
    const cleanContext = this.sanitize(context);

    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      requestId: cleanContext?.requestId,
      context: cleanContext,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
          }
        : undefined,
    };
  }

  private sanitize(obj?: Record<string, any>): Record<string, any> | undefined {
    if (!obj) return undefined;
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'refreshToken', 'secret', 'authorization'];

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  info(message: string, context?: Record<string, any>) {
    const formatted = this.formatLog('info', message, context);
    console.log(JSON.stringify(formatted));
  }

  warn(message: string, context?: Record<string, any>) {
    const formatted = this.formatLog('warn', message, context);
    console.warn(JSON.stringify(formatted));
  }

  error(message: string, error?: Error | unknown, context?: Record<string, any>) {
    const err = error instanceof Error ? error : undefined;
    const formatted = this.formatLog('error', message, context, err);
    console.error(JSON.stringify(formatted));
  }

  debug(message: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      const formatted = this.formatLog('debug', message, context);
      console.debug(JSON.stringify(formatted));
    }
  }
}

export const logger = new Logger();
