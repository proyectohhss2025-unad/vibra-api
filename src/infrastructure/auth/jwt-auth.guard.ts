import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from './public.decorator'
import { AuthGuard } from '@nestjs/passport'
import { AppLoggerService } from 'src/helpers/logger/logger.service'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector, private readonly appLogger: AppLoggerService) { super() }
  canActivate(context: ExecutionContext) {
    // Public routes bypass JWT guard
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const method = request.method
    const url = request.originalUrl || request.url

    // Accept both lowercase and uppercase header names (Express lowercases headers)
    const authHeader: string | undefined = request.headers['authorization'] || request.headers['Authorization']
    const xAccessToken: string | undefined = (request.headers as any)['x-access-token']

    const redact = (val?: string) => {
      if (!val || typeof val !== 'string') return undefined
      const tokenMatch = val.match(/([A-Za-z]+)\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.)[A-Za-z0-9_-]+/)
      if (tokenMatch) return `${tokenMatch[1]} ${tokenMatch[2]}***`
      if (val.split('.').length === 3) return `${val.split('.')[0]}.***`
      return val
    }
    this.appLogger.debug(`JwtAuthGuard IN -> ${method} ${url} | authorization=${redact(authHeader)} | x-access-token=${redact(xAccessToken)}`)

    if ((!authHeader || typeof authHeader !== 'string') && (!xAccessToken || typeof xAccessToken !== 'string')) {
      this.appLogger.warn(`Missing Authorization header for ${method} ${url}`)
      throw new UnauthorizedException('Missing Authorization header')
    }

    // Try to extract token from standard Bearer scheme first
    let sanitizedToken: string | null = null
    if (authHeader && typeof authHeader === 'string') {
      const bearerMatch = authHeader.match(/^\s*Bearer\s+(.*)$/i)
      if (bearerMatch) {
        const rawToken = bearerMatch[1].trim()
        sanitizedToken = rawToken.replace(/^["']+|["']+$/g, '').trim()
      } else {
        // Fallback: if header is just the token without the Bearer prefix, accept it
        const maybeToken = authHeader.replace(/^["']+|["']+$/g, '').trim()
        if (maybeToken && maybeToken.split('.').length === 3) {
          sanitizedToken = maybeToken
        }
      }
    }

    // If still not found, try x-access-token header
    if (!sanitizedToken && xAccessToken && typeof xAccessToken === 'string') {
      const maybeToken = xAccessToken.replace(/^["']+|["']+$/g, '').trim()
      if (maybeToken && maybeToken.split('.').length === 3) {
        sanitizedToken = maybeToken
      }
    }

    if (!sanitizedToken) {
      this.appLogger.warn(`Invalid Authorization header format for ${method} ${url}`)
      throw new UnauthorizedException('Invalid Authorization header format. Expected: Bearer <token>')
    }

    // Overwrite the header to a canonical form so Passport-JWT extractor receives a clean token
    ;(request.headers as any)['authorization'] = `Bearer ${sanitizedToken}`
    this.appLogger.debug(`JwtAuthGuard normalized header -> ${method} ${url} | authorization=Bearer ${sanitizedToken.split('.')[0]}.***`)

    // Let Passport + JwtStrategy validate the token and attach user to the request
    return super.canActivate(context)
  }

  // Ensure any Passport errors or missing user become 401 responses
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      const msg = info?.message || (err?.message as string) || 'Invalid or expired token'
      this.appLogger.warn(`JwtAuthGuard 401 -> ${msg}`)
      throw new UnauthorizedException(msg)
    }
    this.appLogger.debug('JwtAuthGuard OK -> user attached to request')
    return user
  }
}
