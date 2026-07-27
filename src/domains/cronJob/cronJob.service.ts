import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob as CronJobCron } from 'cron';
import { Model, Types } from 'mongoose';
import { CronJob as CronJobModel, CronJobDocument } from './schemas/cronJob.schema';
import { CreateCronJobDto } from './dto/create-cron-job.dto';
import { UpdateCronJobDto } from './dto/update-cron-job.dto';
import { JobTypeRegistry } from './job-type-registry.service';
import { CronJobExecutionService } from './cronJobExecution.service';

@Injectable()
export class CronJobService implements OnModuleInit {
  private readonly logger = new Logger(CronJobService.name);

  constructor(
    @InjectModel(CronJobModel.name) private cronJobModel: Model<CronJobDocument>,
    private schedulerRegistry: SchedulerRegistry,
    private jobTypeRegistry: JobTypeRegistry,
    private executionService: CronJobExecutionService,
  ) {}

  /**
   * Al iniciar el módulo, carga todos los jobs activos desde BD
   * y los registra dinámicamente en el scheduler.
   */
  async onModuleInit() {
    this.logger.log('Inicializando jobs programados desde la base de datos...');
    try {
      const activeJobs = await this.cronJobModel
        .find({ active: true, deletedAt: null })
        .lean()
        .exec();

      let registered = 0;
      for (const job of activeJobs) {
        try {
          await this.registerCronJob(job as any);
          registered++;
        } catch (err) {
          this.logger.error(`Error al registrar job ${job.name} (${job.jobType}): ${err.message}`);
        }
      }
      this.logger.log(`Jobs cargados: ${registered} de ${activeJobs.length} activos`);
    } catch (error) {
      this.logger.error('Error al inicializar jobs:', error.message);
    }
  }

  // ─── CRUD ────────────────────────────────────────────────────────────

  async create(dto: CreateCronJobDto) {
    // Validar que el tipo de job exista en el registro
    const typeDef = this.jobTypeRegistry.get(dto.jobType);
    if (!typeDef) {
      const available = this.jobTypeRegistry.list().map(t => t.name).join(', ');
      throw new BadRequestException(
        `Tipo de job '${dto.jobType}' no válido. Tipos disponibles: ${available}`,
      );
    }

    // Validar expresión cron
    if (!this.isValidCronExpression(dto.expression)) {
      throw new BadRequestException(
        `Expresión cron '${dto.expression}' no es válida. Debe tener 5 campos (minuto hora día-mes mes día-semana)`,
      );
    }

    // Verificar que no exista un job activo con el mismo jobType
    const existing = await this.cronJobModel.findOne({
      jobType: dto.jobType,
      deletedAt: null,
    }).exec();
    if (existing) {
      throw new BadRequestException(
        `Ya existe un job activo con el tipo '${dto.jobType}'. Cada tipo de job solo puede tener una instancia activa.`,
      );
    }

    const created = await this.cronJobModel.create({
      name: dto.name,
      jobType: dto.jobType,
      description: dto.description || '',
      expression: dto.expression,
      active: dto.active ?? true,
      status: dto.active !== false ? 'idle' : 'paused',
      config: dto.config || {},
      retryOnFailure: dto.retryOnFailure ?? false,
      maxRetries: dto.maxRetries ?? 0,
      notifyOnError: dto.notifyOnError ?? false,
      notifyOnSuccess: dto.notifyOnSuccess ?? false,
    });

    // Si está activo, registrar en el scheduler
    if (created.active) {
      await this.registerCronJob(created);
    }

    // Propagar excepción si no se pudo crear
    return this.formatJobResponse(created);
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.cronJobModel
        .find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.cronJobModel.countDocuments({ deletedAt: null }),
    ]);

    const jobs = docs.map(doc => this.formatJobResponse(doc as any));
    return { docs: jobs, total, page, limit };
  }

  async findOne(id: string) {
    const job = await this.cronJobModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!job) {
      throw new NotFoundException(`Job con ID '${id}' no encontrado`);
    }
    return this.formatJobResponse(job);
  }

  async update(id: string, dto: UpdateCronJobDto) {
    const job = await this.cronJobModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!job) {
      throw new NotFoundException(`Job con ID '${id}' no encontrado`);
    }

    const updateData: Record<string, any> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.active !== undefined) updateData.active = dto.active;
    if (dto.config !== undefined) updateData.config = dto.config;
    if (dto.retryOnFailure !== undefined) updateData.retryOnFailure = dto.retryOnFailure;
    if (dto.maxRetries !== undefined) updateData.maxRetries = dto.maxRetries;
    if (dto.notifyOnError !== undefined) updateData.notifyOnError = dto.notifyOnError;
    if (dto.notifyOnSuccess !== undefined) updateData.notifyOnSuccess = dto.notifyOnSuccess;

    // Si cambia la expresión cron, validarla
    if (dto.expression !== undefined) {
      if (!this.isValidCronExpression(dto.expression)) {
        throw new BadRequestException(
          `Expresión cron '${dto.expression}' no es válida`,
        );
      }
      updateData.expression = dto.expression;
    }

    // Si cambia active o expression, re-registrar en scheduler
    const needsReschedule = dto.active !== undefined || dto.expression !== undefined;

    const updated = await this.cronJobModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    // Re-sincronizar con el scheduler
    if (needsReschedule) {
      // Remover job anterior del scheduler
      try {
        this.schedulerRegistry.deleteCronJob(job.jobType);
      } catch {
        // Si no estaba registrado, ignorar
      }

      if (updated.active) {
        await this.registerCronJob(updated);
      }
    }

    return this.formatJobResponse(updated);
  }

  async remove(id: string) {
    const job = await this.cronJobModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!job) {
      throw new NotFoundException(`Job con ID '${id}' no encontrado`);
    }

    // Soft delete
    await this.cronJobModel
      .findByIdAndUpdate(id, {
        $set: {
          deletedAt: new Date(),
          active: false,
          status: 'paused',
        },
      })
      .exec();

    // Remover del scheduler
    try {
      this.schedulerRegistry.deleteCronJob(job.jobType);
    } catch {
      // Ignorar si no estaba registrado
    }

    return this.formatJobResponse(job);
  }

  // ─── CONTROL DE EJECUCIÓN ────────────────────────────────────────────

  /**
   * Activa o desactiva un job (toggle).
   */
  async toggle(id: string) {
    const job = await this.cronJobModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!job) {
      throw new NotFoundException(`Job con ID '${id}' no encontrado`);
    }

    const newActiveState = !job.active;

    if (newActiveState) {
      // Activar: registrar en scheduler
      await this.cronJobModel.findByIdAndUpdate(id, {
        $set: { active: true, status: 'idle' },
      }).exec();
      job.active = true;
      await this.registerCronJob(job);
    } else {
      // Desactivar: remover del scheduler
      await this.cronJobModel.findByIdAndUpdate(id, {
        $set: { active: false, status: 'paused' },
      }).exec();
      try {
        this.schedulerRegistry.deleteCronJob(job.jobType);
      } catch {
        // Ignorar
      }
    }

    return this.findOne(id);
  }

  /**
   * Ejecuta un job de forma manual (inmediata).
   */
  async executeNow(id: string) {
    const job = await this.cronJobModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!job) {
      throw new NotFoundException(`Job con ID '${id}' no encontrado`);
    }

    return this.runJob(job, 'manual');
  }

  // ─── JOB TYPES ───────────────────────────────────────────────────────

  getAvailableJobTypes() {
    return this.jobTypeRegistry.list();
  }

  // ─── EXECUTION HISTORY ───────────────────────────────────────────────

  async getExecutionHistory(id: string, page = 1, limit = 20) {
    const job = await this.cronJobModel.findOne({ _id: id, deletedAt: null }).exec();
    if (!job) {
      throw new NotFoundException(`Job con ID '${id}' no encontrado`);
    }
    return this.executionService.getHistory(job._id, page, limit);
  }

  // ─── MÉTODOS INTERNOS ────────────────────────────────────────────────

  /**
   * Registra un job en el SchedulerRegistry de NestJS.
   */
  private async registerCronJob(job: any) {
    const jobType = job.jobType;
    const expression = job.expression;

    // Si ya existe, lo removemos primero
    try {
      this.schedulerRegistry.deleteCronJob(jobType);
    } catch {
      // No existe previamente
    }

    const cronJob = new CronJobCron(
      expression,
      async () => {
        await this.runJob(job, 'scheduler');
      },
      null, // onComplete
      false, // startNow — lo iniciaremos manualmente
    );

    (this.schedulerRegistry as any).addCronJob(jobType, cronJob);
    cronJob.start();

    // Calcular próxima ejecución
    const nextDate = cronJob.nextDate();
    const nextRunAt = nextDate
      ? typeof nextDate.toJSDate === 'function'
        ? nextDate.toJSDate()
        : new Date(nextDate.toString())
      : null;

    // Actualizar nextRunAt en BD
    await this.cronJobModel.findByIdAndUpdate(job._id, {
      $set: { status: 'idle', nextRunAt },
    }).exec();

    this.logger.log(
      `Job registrado: ${job.name} (${jobType}) — expresión: ${expression} — próx: ${nextRunAt?.toISOString()}`,
    );
  }

  /**
   * Ejecuta un job: registra inicio, llama al handler, registra resultado.
   */
  private async runJob(
    job: CronJobDocument,
    triggeredBy: 'scheduler' | 'manual' | 'retry' = 'scheduler',
  ) {
    const startTime = Date.now();
    const execution = await this.executionService.startExecution(
      job._id,
      job.jobType,
      job.name,
      triggeredBy,
    );

    // Marcar como running en BD
    await this.cronJobModel.findByIdAndUpdate(job._id, {
      $set: { status: 'running' },
    }).exec();

    try {
      const result = await this.jobTypeRegistry.execute(job.jobType, job.config || {});

      const duration = Date.now() - startTime;

      // Marcar éxito en BD
      await this.cronJobModel.findByIdAndUpdate(job._id, {
        $set: {
          status: 'idle',
          lastRunAt: new Date(),
          lastResult: 'success',
          lastErrorMessage: '',
          lastDuration: duration,
          nextRunAt: this.getNextRun(job.jobType),
        },
      }).exec();

      // Registrar ejecución exitosa
      await this.executionService.completeExecution(execution._id, result.output);

      this.logger.log(`Job ejecutado: ${job.name} — éxito (${duration}ms)`);

      return { success: true, message: result.message, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error.message || 'Error desconocido';

      // Marcar error en BD
      await this.cronJobModel.findByIdAndUpdate(job._id, {
        $set: {
          status: 'error',
          lastRunAt: new Date(),
          lastResult: 'error',
          lastErrorMessage: errorMsg.substring(0, 2000),
          lastDuration: duration,
        },
      }).exec();

      // Registrar ejecución fallida
      await this.executionService.failExecution(execution._id, errorMsg);

      this.logger.error(`Job fallido: ${job.name} — ${errorMsg} (${duration}ms)`);

      // Notificar si está configurado
      if (job.notifyOnError) {
        this.logger.warn(`[NOTIFICACIÓN PENDIENTE] Job ${job.name} falló: ${errorMsg}`);
      }

      return { success: false, message: errorMsg, duration, error: errorMsg };
    }
  }

  /**
   * Obtiene la próxima fecha de ejecución desde el scheduler registry.
   */
  private getNextRun(jobType: string): Date | null {
    try {
      const cronJob = this.schedulerRegistry.getCronJob(jobType);
      const nextDate = cronJob.nextDate();
      return nextDate ? nextDate.toJSDate() : null;
    } catch {
      return null;
    }
  }

  /**
   * Valida una expresión cron de 5 campos.
   */
  private isValidCronExpression(expression: string): boolean {
    try {
      const fields = expression.trim().split(/\s+/);
      if (fields.length !== 5) return false;

      // Intentar crear un CronJob temporal para validar
      new CronJobCron(expression, () => {}, null, false);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Formatea un documento de BD para respuesta API.
   */
  private formatJobResponse(job: any) {
    const doc = job.toObject ? job.toObject() : job;
    return {
      _id: doc._id,
      name: doc.name,
      jobType: doc.jobType,
      description: doc.description,
      expression: doc.expression,
      active: doc.active,
      status: doc.status,
      lastRunAt: doc.lastRunAt,
      lastResult: doc.lastResult,
      lastErrorMessage: doc.lastErrorMessage,
      lastDuration: doc.lastDuration,
      nextRunAt: doc.nextRunAt,
      config: doc.config,
      retryOnFailure: doc.retryOnFailure,
      maxRetries: doc.maxRetries,
      notifyOnError: doc.notifyOnError,
      notifyOnSuccess: doc.notifyOnSuccess,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
