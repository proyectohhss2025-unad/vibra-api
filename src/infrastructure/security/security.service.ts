import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { BlockedIp, RelapseEntry } from './schemas/blocked-ip.schema';
import { IpMetadata } from './interfaces/ip-metadata.interface';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private readonly ipApiUrl = 'http://ip-api.com/json';

  constructor(
    @InjectModel(BlockedIp.name)
    private readonly blockedIpModel: Model<BlockedIp>,
    private readonly configService: ConfigService,
  ) {}

  // ─── Public API ────────────────────────────────────────────────────────

  /**
   * Bloquea una IP: consulta ip-api.com para metadata y la persiste en MongoDB.
   * Si la IP ya existe y está liberada, la vuelve a bloquear (reincidencia).
   */
  async blockIP(ip: string, attemptCount = 0): Promise<BlockedIp> {
    const metadata = await this.fetchIpMetadata(ip);

    const existing = await this.blockedIpModel.findOne({ ip });

    if (existing) {
      if (existing.releasedAt === null) {
        // Ya está bloqueada → solo actualizar intentos y metadata si faltaba
        existing.attemptCount = Math.max(existing.attemptCount, attemptCount);
        if (!existing.metadata && metadata) {
          existing.metadata = metadata as any;
        }
        return existing.save();
      }

      // Reincidencia: IP fue liberada y ahora vuelve a atacar
      const relapseEntry = new RelapseEntry();
      relapseEntry.blockedAt = new Date();
      relapseEntry.releasedAt = null;
      relapseEntry.attemptCount = attemptCount;

      existing.relapseHistory.push(relapseEntry);
      existing.relapseCount += 1;
      existing.blockedAt = new Date();
      existing.releasedAt = null;
      existing.releasedBy = null;
      existing.attemptCount = attemptCount;
      if (!existing.metadata && metadata) {
        existing.metadata = metadata as any;
      }

      return existing.save();
    }

    // Nueva IP bloqueada
    const blockedIp = new this.blockedIpModel({
      ip,
      attemptCount,
      blockedAt: new Date(),
      blockedBy: 'auto',
      metadata: metadata as any,
    });

    return blockedIp.save();
  }

  /**
   * Libera una IP de la lista negra (solo admin).
   */
  async releaseIP(ip: string, adminUserId: string): Promise<BlockedIp> {
    const blockedIp = await this.blockedIpModel.findOne({
      ip,
      releasedAt: null,
    });

    if (!blockedIp) {
      throw new NotFoundException(`IP "${ip}" no está bloqueada o no existe`);
    }

    blockedIp.releasedAt = new Date();
    blockedIp.releasedBy = adminUserId;

    // Actualizar último relapseHistory si existe
    if (blockedIp.relapseHistory.length > 0) {
      const lastRelapse =
        blockedIp.relapseHistory[blockedIp.relapseHistory.length - 1];
      lastRelapse.releasedAt = blockedIp.releasedAt;
    }

    return blockedIp.save();
  }

  /**
   * Verifica si una IP está actualmente bloqueada.
   */
  async isBlocked(ip: string): Promise<boolean> {
    const count = await this.blockedIpModel.countDocuments({
      ip,
      releasedAt: null,
    });
    return count > 0;
  }

  /**
   * Lista paginada de IPs bloqueadas/liberadas.
   */
  async getBlockedIps(
    page = 1,
    limit = 20,
    filter?: 'blocked' | 'released',
  ): Promise<{
    data: BlockedIp[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const query: Record<string, any> = {};

    if (filter === 'blocked') {
      query.releasedAt = null;
    } else if (filter === 'released') {
      query.releasedAt = { $ne: null };
    }

    const total = await this.blockedIpModel.countDocuments(query);
    const data = await this.blockedIpModel
      .find(query)
      .sort({ blockedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      data: data as unknown as BlockedIp[],
      total,
      page,
      pageSize: limit,
    };
  }

  /**
   * Obtiene el detalle de una IP específica.
   */
  async getBlockedIp(ip: string): Promise<BlockedIp> {
    const blockedIp = await this.blockedIpModel.findOne({ ip });

    if (!blockedIp) {
      throw new NotFoundException(`IP "${ip}" no encontrada en la lista negra`);
    }

    return blockedIp;
  }

  /**
   * Re-consulta la metadata de una IP desde ip-api.com y actualiza el registro.
   */
  async refreshIpMetadata(ip: string): Promise<BlockedIp> {
    const blockedIp = await this.blockedIpModel.findOne({ ip });

    if (!blockedIp) {
      throw new NotFoundException(`IP "${ip}" no encontrada en la lista negra`);
    }

    const metadata = await this.fetchIpMetadata(ip);
    if (metadata) {
      blockedIp.metadata = metadata as any;
      await blockedIp.save();
    }

    return blockedIp;
  }

  /**
   * Actualiza el contador de intentos de una IP bloqueada.
   */
  async recordAttempt(ip: string): Promise<void> {
    await this.blockedIpModel.updateOne({ ip }, { $inc: { attemptCount: 1 } });
  }

  /**
   * Elimina una IP de la colección (no solo liberar, sino borrar registro).
   */
  async deleteBlockedIp(ip: string): Promise<void> {
    const result = await this.blockedIpModel.deleteOne({ ip });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`IP "${ip}" no encontrada en la lista negra`);
    }
  }

  // ─── Privados ──────────────────────────────────────────────────────────

  /**
   * Consulta ip-api.com para obtener metadata de una IP.
   * Timeout de 3s. Si falla, retorna null sin interrumpir el flujo.
   */
  private async fetchIpMetadata(ip: string): Promise<IpMetadata | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.ipApiUrl}/${ip}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(
          `ip-api.com responded with ${response.status} for IP ${ip}`,
        );
        return null;
      }

      const data = await response.json();

      if (data.status === 'fail') {
        this.logger.warn(
          `ip-api.com returned fail for IP ${ip}: ${data.message || 'unknown'}`,
        );
        return null;
      }

      return {
        status: data.status,
        country: data.country || '',
        countryCode: data.countryCode || '',
        region: data.region || '',
        city: data.city || '',
        zip: data.zip || '',
        lat: data.lat || 0,
        lon: data.lon || 0,
        timezone: data.timezone || '',
        isp: data.isp || '',
        org: data.org || '',
        as: data.as || '',
        query: data.query || ip,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.logger.warn(`ip-api.com timeout for IP ${ip}`);
      } else {
        this.logger.error(`ip-api.com error for IP ${ip}: ${error.message}`);
      }
      return null;
    }
  }
}
