import { Injectable } from '@nestjs/common';

interface CacheEntry {
  blocked: boolean;
  expiresAt: number;
}

/**
 * Cache en memoria para verificar IPs bloqueadas.
 * TTL de 60s. Sigue el patrón de PermissionCacheService.
 */
@Injectable()
export class BlockedIpCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly defaultTtl = 60; // segundos

  /**
   * Verifica si una IP está en cache como bloqueada.
   * Retorna null si no está en cache o expiró.
   */
  get(ip: string): boolean | null {
    const entry = this.cache.get(ip);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(ip);
      return null;
    }
    return entry.blocked;
  }

  /**
   * Almacena el estado de bloqueo de una IP en cache.
   */
  set(ip: string, blocked: boolean, ttlSeconds?: number): void {
    const ttl = ttlSeconds ?? this.defaultTtl;
    this.cache.set(ip, {
      blocked,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  /**
   * Invalida una IP del cache (útil al liberar una IP).
   */
  invalidate(ip: string): void {
    this.cache.delete(ip);
  }

  /**
   * Limpia todas las entradas expiradas.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }
}
