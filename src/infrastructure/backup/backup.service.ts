import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BackupConfigService } from './backup-config.service';
import { AppLoggerService } from '../../helpers/logger/logger.service';
import { NotificationService } from '../../domains/notification/notification.service';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  constructor(
    private readonly backupConfig: BackupConfigService,
    private readonly notificationService: NotificationService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Generates a timestamp string using native Intl.DateTimeFormat.
   * Replaces the deprecated moment library.
   */
  private formatTimestamp(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const y = date.getFullYear();
    const M = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const m = pad(date.getMinutes());
    const s = pad(date.getSeconds());
    return `${y}-${M}-${d}_${h}-${m}-${s}`;
  }

  /**
   * Builds the mongodump command string with optional authentication.
   */
  private buildDumpCommand(config: {
    mongoHost: string;
    mongoPort: string;
    database: string;
    backupPath: string;
    username: string;
    password: string;
    authDb: string;
    hasAuth: boolean;
  }): string {
    let cmd = `mongodump --host ${config.mongoHost} --port ${config.mongoPort} --db ${config.database} --out ${config.backupPath}`;

    if (config.hasAuth) {
      cmd += ` --username ${config.username} --password ${config.password} --authenticationDatabase ${config.authDb}`;
    }

    return cmd;
  }

  /**
   * Executes a database backup using mongodump.
   *
   * @param user - Optional user object for notification attribution
   * @returns Object with success status, message, and backup path
   */
  async executeBackup(user?: any): Promise<{
    success: boolean;
    message: string;
    path?: string;
  }> {
    const cfg = this.backupConfig.config;
    const currentDate = new Date();
    const formattedDate = this.formatTimestamp(currentDate);
    const backupPath = `${cfg.backupDir}/${formattedDate}`;

    try {
      const dumpCommand = this.buildDumpCommand({
        mongoHost: cfg.mongoHost,
        mongoPort: cfg.mongoPort,
        database: cfg.database,
        backupPath,
        username: cfg.username,
        password: cfg.password,
        authDb: cfg.authDb,
        hasAuth: this.backupConfig.hasAuth,
      });

      this.logger.log(
        `Ejecutando backup: mongodump --host ${cfg.mongoHost} --port ${cfg.mongoPort} --db ${cfg.database} --out ${backupPath}`,
      );

      await execAsync(dumpCommand);

      const message = `La copia de seguridad se ha generado con éxito en la fecha ${currentDate.toISOString().split('T')[0]}`;
      await this.notificationService.createGeneralNotification(
        message,
        'Copia de seguridad exitosa',
        user,
      );

      this.logger.log(`Backup completado: ${backupPath}`);
      return { success: true, message, path: backupPath };
    } catch (error) {
      this.logger.error(
        `Error generando la copia de seguridad: ${error.message}`,
      );
      throw new Error(`Error generating backup: ${error.message}`);
    }
  }
}
