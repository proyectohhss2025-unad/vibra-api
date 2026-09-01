import { Injectable, Logger } from '@nestjs/common';
import { BackupService } from '../../infrastructure/backup/backup.service';
import { ActivitiesService } from '../activities/activities.service';
import { RankingService } from '../rankings/ranking.service';

/**
 * Interfaz que debe implementar todo job registrable.
 */
export interface JobHandler {
  execute(
    config: Record<string, any>,
  ): Promise<{ success: boolean; message: string; output?: any }>;
}

/**
 * Registro central de tipos de jobs disponibles en el sistema.
 * Cada tipo de job se registra con su nombre, descripción, schema de configuración
 * y el handler que lo ejecuta.
 *
 * Los administradores crean instancias de jobs refiriéndose a estos tipos
 * registrados, no pueden ejecutar código arbitrario.
 */
@Injectable()
export class JobTypeRegistry {
  private readonly logger = new Logger(JobTypeRegistry.name);
  private readonly registry = new Map<string, JobTypeDefinition>();

  constructor(
    private backupService: BackupService,
    private activitiesService: ActivitiesService,
    private rankingService: RankingService,
  ) {
    this.registerDefaults();
  }

  private registerDefaults() {
    // --- BACKUP_DB ---
    this.register({
      name: 'BACKUP_DB',
      label: 'Backup de Base de Datos',
      description: 'Ejecuta un respaldo completo de MongoDB usando mongodump.',
      configSchema: {
        type: 'object',
        properties: {
          backupDir: { type: 'string', description: 'Directorio de respaldo' },
          compress: { type: 'boolean', description: 'Comprimir el respaldo' },
        },
      },
      handler: async (config) => {
        const result = await this.backupService.executeBackup();
        return { success: true, message: 'Backup ejecutado', output: result };
      },
    });

    // --- GENERATE_WEEKLY_PLAN ---
    this.register({
      name: 'GENERATE_WEEKLY_PLAN',
      label: 'Generar Plan Semanal',
      description:
        'Genera el plan semanal de actividades para todos los participantes activos.',
      configSchema: {
        type: 'object',
        properties: {
          emotionsCount: {
            type: 'number',
            description: 'Cantidad de emociones a incluir',
            default: 7,
          },
        },
      },
      handler: async (config) => {
        const emotions = await this.activitiesService.getRandomEmotions(
          config.emotionsCount || 7,
        );
        const activities =
          await this.activitiesService.assignActivities(emotions);

        const weekSchedule = activities.map((activity: any, index: number) => ({
          date: this.getNextWeekDate(index),
          emotion: activity.emotion?._id?.toString() || '',
          activity: activity._id?.toString() || '',
          status: 'pending',
        }));

        await this.activitiesService.createWeeklySchedule({
          weekNumber: this.activitiesService.getCurrentWeek(),
          year: new Date().getFullYear(),
          days: weekSchedule,
          participants: await this.activitiesService.getActiveUsers(),
        } as any);

        return {
          success: true,
          message: `Plan semanal generado con ${weekSchedule.length} días`,
          output: { daysCount: weekSchedule.length },
        };
      },
    });

    // --- DEACTIVATE_EXPIRED ---
    this.register({
      name: 'DEACTIVATE_EXPIRED',
      label: 'Desactivar Actividades Vencidas',
      description: 'Desactiva actividades cuya fecha de programación ya pasó.',
      configSchema: { type: 'object', properties: {} },
      handler: async () => {
        const count =
          await this.activitiesService.deactivateExpiredActivities();
        return {
          success: true,
          message: `${count} actividades desactivadas`,
          output: { count },
        };
      },
    });

    // --- UPDATE_RANKINGS ---
    this.register({
      name: 'UPDATE_RANKINGS',
      label: 'Actualizar Rankings',
      description:
        'Recalcula y emite los rankings de participantes vía WebSocket.',
      configSchema: { type: 'object', properties: {} },
      handler: async () => {
        await this.rankingService.updateRankings();
        return { success: true, message: 'Rankings actualizados' };
      },
    });

    // --- API_CALL (genérico) ---
    this.register({
      name: 'API_CALL',
      label: 'Llamada HTTP',
      description: 'Realiza una petición HTTP a una URL configurable.',
      configSchema: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string', description: 'URL a llamar' },
          method: { type: 'string', enum: ['GET', 'POST'], default: 'GET' },
          headers: { type: 'object', description: 'Headers HTTP adicionales' },
          body: { type: 'object', description: 'Cuerpo de la petición (POST)' },
        },
      },
      handler: async (config) => {
        this.logger.log(`Ejecutando API_CALL a ${config.url}`);
        const method = config.method || 'GET';
        const options: any = { method };
        if (method === 'POST' && config.body) {
          options.headers = {
            'Content-Type': 'application/json',
            ...(config.headers || {}),
          };
          options.body = JSON.stringify(config.body);
        }
        const response = await fetch(config.url, options);
        const text = await response.text();
        return {
          success: response.ok,
          message: `HTTP ${response.status}: ${text.substring(0, 500)}`,
          output: {
            status: response.status,
            bodyPreview: text.substring(0, 500),
          },
        };
      },
    });
  }

  /**
   * Registra un nuevo tipo de job en el sistema.
   */
  register(def: JobTypeDefinition): void {
    if (this.registry.has(def.name)) {
      this.logger.warn(
        `JobType '${def.name}' ya está registrado. Se reemplazará.`,
      );
    }
    this.registry.set(def.name, def);
    this.logger.log(`JobType registrado: ${def.name} — ${def.label}`);
  }

  /**
   * Obtiene la definición de un tipo de job por su nombre.
   */
  get(name: string): JobTypeDefinition | undefined {
    return this.registry.get(name);
  }

  /**
   * Lista todos los tipos de job registrados (para el endpoint /types).
   */
  list(): JobTypeInfo[] {
    const infos: JobTypeInfo[] = [];
    for (const [, def] of this.registry) {
      infos.push({
        name: def.name,
        label: def.label,
        description: def.description,
        configSchema: def.configSchema,
      });
    }
    return infos;
  }

  /**
   * Ejecuta el handler de un tipo de job.
   */
  async execute(
    jobType: string,
    config: Record<string, any>,
  ): Promise<{ success: boolean; message: string; output?: any }> {
    const def = this.registry.get(jobType);
    if (!def) {
      throw new Error(`Tipo de job '${jobType}' no está registrado`);
    }
    return def.handler(config);
  }

  private getNextWeekDate(dayIndex: number): Date {
    const currentDate = new Date();
    const daysToAdd = dayIndex - currentDate.getDay();
    const nextWeekDate = new Date(currentDate);
    nextWeekDate.setDate(currentDate.getDate() + daysToAdd);
    return nextWeekDate;
  }
}

export interface JobTypeDefinition {
  name: string;
  label: string;
  description: string;
  configSchema: Record<string, any>;
  handler: JobHandler['execute'];
}

export interface JobTypeInfo {
  name: string;
  label: string;
  description: string;
  configSchema: Record<string, any>;
}
