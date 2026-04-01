import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  // Middleware SOLO de trazabilidad: no valida ni bloquea; solo registra y deja pasar
  use(req: Request, res: Response, next: () => void) {
    const method = req.method;
    const url = req.originalUrl || req.url;

    // Header names in Node are lower-cased; support both just in case
    const rawAuthHeader =
      req.headers['authorization'] || (req.headers as any)['Authorization'];
    const rawXAccessToken = (req.headers as any)['x-access-token'];

    // Redacta tokens para evitar exponerlos completos en logs
    const redact = (val?: string) => {
      if (!val || typeof val !== 'string') return undefined;
      const tokenMatch = val.match(
        /([A-Za-z]+)\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.)[A-Za-z0-9_-]+/,
      );
      if (tokenMatch) return `${tokenMatch[1]} ${tokenMatch[2]}***`;
      if (val.split('.').length === 3) return `${val.split('.')[0]}.***`;
      return val;
    };

    // Log de entrada (sin modificar encabezados)
    this.logger.debug(
      `AuthMiddleware IN -> ${method} ${url} | authorization=${redact(rawAuthHeader as string)} | x-access-token=${redact(rawXAccessToken as string)}`,
    );

    // NO validar, NO reescribir headers, NO devolver 401. La autorización la maneja JwtAuthGuard.
    this.logger.debug(
      `AuthMiddleware PASS -> ${method} ${url} | forwarded to guards (no auth logic here)`,
    );
    next();
  }
}
