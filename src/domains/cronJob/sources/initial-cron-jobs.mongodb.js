/**
 * Seed de jobs programados por defecto.
 *
 * Estos jobs se registran automáticamente al iniciar el sistema
 * a través de CronJobService.onModuleInit().
 *
 * Para ejecutar manualmente en MongoDB Shell:
 *   use vibra_db
 *   load("src/domains/cronJob/sources/initial-cron-jobs.mongodb.js")
 */

// Solo insertar si no existen jobs previos
const existingCount = db.cronjobs.countDocuments({ deletedAt: null });
if (existingCount > 0) {
  print(`Ya existen ${existingCount} jobs. Omitiendo seed.`);
} else {
  const now = new Date();
  const jobs = [
    {
      name: 'Backup diario de BD',
      jobType: 'BACKUP_DB',
      description: 'Realiza un respaldo completo de la base de datos MongoDB usando mongodump.',
      expression: '0 0 * * *',
      active: true,
      status: 'idle',
      config: {},
      retryOnFailure: true,
      maxRetries: 2,
      notifyOnError: true,
      notifyOnSuccess: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      name: 'Generar plan semanal',
      jobType: 'GENERATE_WEEKLY_PLAN',
      description: 'Genera el plan semanal de actividades emocionales para todos los participantes activos.',
      expression: '48 22 * * *',
      active: true,
      status: 'idle',
      config: { emotionsCount: 7 },
      retryOnFailure: true,
      maxRetries: 1,
      notifyOnError: true,
      notifyOnSuccess: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      name: 'Desactivar actividades vencidas',
      jobType: 'DEACTIVATE_EXPIRED',
      description: 'Desactiva actividades cuya fecha de programación ya pasó.',
      expression: '0 5 * * *',
      active: true,
      status: 'idle',
      config: {},
      retryOnFailure: false,
      maxRetries: 0,
      notifyOnError: true,
      notifyOnSuccess: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      name: 'Verificar cobertura de Actividad Diaria',
      jobType: 'CHECK_DAILY_COVERAGE',
      description: 'Revisa la próxima semana y notifica si hay días sin Actividad Diaria programada.',
      expression: '0 15 * * 5',
      active: true,
      status: 'idle',
      config: { weeksAhead: 1, notify: true },
      retryOnFailure: true,
      maxRetries: 1,
      notifyOnError: true,
      notifyOnSuccess: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      name: 'Actualizar rankings',
      jobType: 'UPDATE_RANKINGS',
      description: 'Recalcula los rankings de participantes y los emite vía WebSocket.',
      expression: '*/5 * * * *',
      active: true,
      status: 'idle',
      config: {},
      retryOnFailure: false,
      maxRetries: 0,
      notifyOnError: false,
      notifyOnSuccess: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ];

  const result = db.cronjobs.insertMany(jobs);
  print(`${result.insertedIds.length} jobs insertados correctamente.`);
}
