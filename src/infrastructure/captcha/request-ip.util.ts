/**
 * Obtiene la IP real del cliente detrás de proxies (Nginx, balanceadores).
 * Mismo criterio que usa el ThrottlerGuard para que el bloqueo sea coherente.
 */
export function getClientIp(request: any): string {
  const forwardedFor = request?.headers?.['x-forwarded-for'];

  if (forwardedFor) {
    const first = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : String(forwardedFor).split(',')[0];
    return first.trim();
  }

  const realIp = request?.headers?.['x-real-ip'];
  if (realIp) {
    return String(realIp).trim();
  }

  return (
    request?.ip ||
    request?.connection?.remoteAddress ||
    request?.socket?.remoteAddress ||
    'unknown'
  );
}
