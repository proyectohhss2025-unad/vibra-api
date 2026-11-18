import { Injectable, LoggerService } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { createLogger, format, Logger, transports } from 'winston';

const LOG_DIR = 'logs';
const ERROR_LOG_FILE = `${LOG_DIR}/error.log`;

/**
 * Logger compartido a nivel de módulo.
 *
 * Se crea UNA sola vez por proceso porque `AppLoggerService` se instancia en
 * dos sitios: por inyección (`LoggerModule` es `@Global()`) y manualmente en
 * `main.ts` (handlers de `process`).
 */
function createSharedLogger(): Logger {
  try {
    // Winston crea el archivo, pero no el directorio.
    mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // Sin permisos para crear `logs/`: la consola sigue funcionando.
  }

  return createLogger({
    level: 'info',
    format: format.combine(
      format.timestamp(),
      format.printf(
        ({ timestamp, level, message }: any) =>
          `${timestamp} ${level}: ${message}`,
      ),
    ),
    transports: [
      new transports.Console(),
      // Persistencia en disco (solo errores) para diagnosticar caídas.
      new transports.File({
        filename: ERROR_LOG_FILE,
        level: 'error',
        format: format.combine(format.timestamp(), format.json()),
      }),
    ],
  });
}

const sharedLogger = createSharedLogger();

@Injectable()
export class AppLoggerService implements LoggerService {
  private logger: Logger = sharedLogger;

  log(message: string) {
    this.logger.info(message);
  }

  /**
   * `stack` y `context` los envía el manejador de excepciones de Nest
   * (`logger.error(message, stack)`); antes se descartaban.
   */
  error(message: any, stack?: string, context?: string) {
    const suffix = context ? ` [${context}]` : '';
    const text = `${String(message)}${suffix}`;
    this.logger.error(stack ? `${text}\n${stack}` : text);
  }

  warn(message: string) {
    this.logger.warn(message);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  verbose(message: string) {
    this.logger.verbose(message);
  }
}
