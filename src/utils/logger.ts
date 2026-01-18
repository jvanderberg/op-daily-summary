type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_COLORS = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  reset: '\x1b[0m',
};

class Logger {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  private format(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const ctx = this.context ? `[${this.context}]` : '';
    return `${LOG_COLORS[level]}${timestamp} ${level.toUpperCase()} ${ctx} ${message}${LOG_COLORS.reset}`;
  }

  debug(message: string): void {
    console.log(this.format('debug', message));
  }

  info(message: string): void {
    console.log(this.format('info', message));
  }

  warn(message: string): void {
    console.warn(this.format('warn', message));
  }

  error(message: string, error?: Error): void {
    console.error(this.format('error', message));
    if (error) {
      console.error(error.stack);
    }
  }

  child(context: string): Logger {
    const childContext = this.context ? `${this.context}:${context}` : context;
    return new Logger(childContext);
  }
}

export const logger = new Logger();
export const createLogger = (context: string) => new Logger(context);
