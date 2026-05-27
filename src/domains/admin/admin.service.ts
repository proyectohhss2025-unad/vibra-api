import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { AppLoggerService } from 'src/helpers/logger/logger.service';
import * as fs from 'fs';
import * as path from 'path';
import {
  NOTIFICATION_CHANNEL_INBOX,
  NOTIFICATION_TYPE_ALERT,
  NOTIFICATION_TYPE_INFO,
} from '../../utils/constants';
import { generateSerial } from '../../utils/string';
import { BackupService } from '../../infrastructure/backup/backup.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AdminService {
  private logger = new AppLoggerService();

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    @InjectModel(File.name) private fileModel: Model<File>,
    @InjectModel(Report.name) private reportModel: Model<Report>,
    private backupService: BackupService,
    private notificationService: NotificationService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate database backups
   *
   * @returns {Promise<string>} - Success message
   * @throws {Error} - If there is an error generating the backup
   */
  async generateBackups(user: any): Promise<string> {
    const result = await this.backupService.executeBackup(user);
    this.logger.log(result.message);
    return result.message;
  }

  /**
   * Check invoices and generate notifications
   *
   * @returns {Promise<string>} - Success message
   * @throws {Error} - If there is an error checking invoices
   */
  async checkInvoices(): Promise<string> {
    try {
      //INFO: Invoices overdue today
      try {
        await this.createNotification('Vencen hoy');
      } catch (error) {
        console.error('Error checking invoices: ', error);
      }

      return 'Exito en la generación de notificaciones';
    } catch (error) {
      this.logger.error(`Error en la generación de notificaciones ${error}`);
      throw new Error('Error en la generación de notificaciones');
    }
  }

  /**
   * Delete all documents for testing purposes
   *
   * @returns {Promise<string>} - Success message
   * @throws {Error} - If there is an error deleting documents
   */
  async deleteAllDocumentsByTest(): Promise<string> {
    try {
      // Create a session to manage transactions
      const session = await mongoose.startSession();
      session.startTransaction(); // Begin transaction

      try {
        // Delete all documents in the collections within the transaction
        await this.fileModel.deleteMany({});
        await this.notificationModel.deleteMany({});
        await this.reportModel.deleteMany({});

        await session.commitTransaction(); // Commit the transaction
        this.logger.log(
          'Los datos en las colecciones han sido borrados con exito.',
        );
        return 'Los datos en las colecciones han sido borrados con exito.';
      } catch (error: any) {
        await session.abortTransaction(); // Abort the transaction if any error occurs
        this.logger.error(
          `Error eliminando Los datos en las colecciones.${error}`,
        );
        throw new Error('Error eliminando Los datos en las colecciones.');
      } finally {
        // Ensure session is ended, whether successful or not
        session.endSession();
      }
    } catch (error) {
      this.logger.error(
        `Error eliminando Los datos en las colecciones. ${error}`,
      );
      throw new Error('Error eliminando Los datos en las colecciones.');
    }
  }

  /**
   * Create a notification for an participant
   *
   * @param participant - Invoice object
   * @param participant - Participant object
   * @param title - Notification title
   */
  private async createNotification(title: string): Promise<void> {
    await this.notificationService.createNotification(title);
  }

  /**
   * Get status information about the ideas.json file
   *
   * @returns Ideas file status
   */
  async getIdeasStatus(): Promise<{
    ideasPath: string;
    resolvedPath: string;
    fileExists: boolean;
    totalIdeas: number;
    enDesarrollo: number;
    pendientes: number;
    lastModified: string | null;
  }> {
    const relativePath = this.configService.get<string>(
      'IDEAS_JSON_PATH',
      '../.opencode/skills/ideas/data/ideas.json',
    );
    const resolvedPath = path.resolve(process.cwd(), relativePath);
    const fileExists = fs.existsSync(resolvedPath);

    let totalIdeas = 0;
    let enDesarrollo = 0;
    let pendientes = 0;
    let lastModified: string | null = null;

    if (fileExists) {
      try {
        const raw = fs.readFileSync(resolvedPath, 'utf8');
        const data = JSON.parse(raw);
        const ideas = data.ideas || [];
        totalIdeas = ideas.length;
        enDesarrollo = ideas.filter(
          (i: any) => i.estado === 'en_desarrollo',
        ).length;
        pendientes = ideas.filter(
          (i: any) => i.estado === 'pendiente',
        ).length;
        const stats = fs.statSync(resolvedPath);
        lastModified = stats.mtime.toISOString();
      } catch (error) {
        this.logger.error(`Error reading ideas.json: ${error.message}`);
      }
    }

    return {
      ideasPath: relativePath,
      resolvedPath,
      fileExists,
      totalIdeas,
      enDesarrollo,
      pendientes,
      lastModified,
    };
  }

  /**
   * Get all unique tags from ideas.json for autocomplete
   *
   * @returns List of unique tags sorted alphabetically
   */
  async getAvailableTags(): Promise<{ tags: string[] }> {
    const relativePath = this.configService.get<string>(
      'IDEAS_JSON_PATH',
      '../.opencode/skills/ideas/data/ideas.json',
    );
    const resolvedPath = path.resolve(process.cwd(), relativePath);

    if (!fs.existsSync(resolvedPath)) {
      return { tags: [] };
    }

    try {
      const raw = fs.readFileSync(resolvedPath, 'utf8');
      const data = JSON.parse(raw);
      const allTags: string[] = (data.ideas || [])
        .flatMap((idea: any) => idea.tags || [])
        .filter((tag: any) => tag && typeof tag === 'string' && tag.trim().length > 0)
        .map((tag: string) => tag.trim().toLowerCase());

      const uniqueTags = [...new Set(allTags)].sort();
      return { tags: uniqueTags };
    } catch (error) {
      this.logger.error(`Error reading tags from ideas.json: ${error.message}`);
      return { tags: [] };
    }
  }
}
