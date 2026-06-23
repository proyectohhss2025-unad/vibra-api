import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from './logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly loggerService: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Interceptar el evento 'finish' de la respuesta para capturar el status code
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;

      // Solo loguear peticiones a rutas /api/ (evita duplicar logs de recursos estáticos)
      if (req.originalUrl?.startsWith('/api/')) {
        this.loggerService
          .saveLog({
            id: crypto.randomUUID(),
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            responseTime,
            timestamp: new Date().toISOString(),
            ipAddress:
              req.headers['x-forwarded-for']?.toString() || req.ip || '',
            userAgent: req.headers['user-agent'] || '',
            origin:
              req.headers['origin']?.toString() ||
              req.headers['referer']?.toString() ||
              '',
          })
          .catch((err) =>
            console.error('Error saving request log:', err.message),
          );
      }
    });

    next();
  }
}
