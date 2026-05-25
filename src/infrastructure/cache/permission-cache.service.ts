import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Cache simple en memoria para permisos de usuario.
 * TTL configurable. Thread-safe para operaciones concurrentes.
 */
@Injectable()
export class PermissionCacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTtl = 60; // segundos

  /**
   * Obtiene un valor del cache. Si no existe o expiró,
   * ejecuta el fetcher y almacena el resultado.
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    const now = Date.now();
    const entry = this.cache.get(key);

    if (entry && entry.expiresAt > now) {
      return entry.data as T;
    }

    const data = await fetcher();
    const ttl = ttlSeconds ?? this.defaultTtl;

    this.cache.set(key, {
      data,
      expiresAt: now + ttl * 1000,
    });

    return data;
  }

  /**
   * Invalida una entrada específica del cache.
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalida el cache de permisos para un usuario específico.
   */
  invalidateByUser(userId: string): void {
    this.cache.delete(`user_permissions_${userId}`);
  }

  /**
   * Limpia todas las entradas expiradas del cache.
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
