import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { AppLoggerService } from 'src/helpers/logger/logger.service';
import { BackupService } from '../../infrastructure/backup/backup.service';
import { File } from '../files/schemas/file.schema';
import { IdeasService } from '../ideas/ideas.service';
import { NotificationService } from '../notification/notification.service';
import { Notification } from '../notification/schemas/notification.schema';
import { Report } from '../reports/schemas/report.schema';

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
    private ideasService: IdeasService,
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
   * Get status information about the ideas collection in MongoDB
   *
   * @returns Ideas status from MongoDB
   */
  async getIdeasStatus(): Promise<{
    totalIdeas: number;
    enDesarrollo: number;
    pendientes: number;
    completadas: number;
  }> {
    try {
      const estadisticas = await this.ideasService.getEstadisticas();
      return {
        totalIdeas: estadisticas.total,
        enDesarrollo: estadisticas.en_desarrollo,
        pendientes: estadisticas.pendientes,
        completadas: estadisticas.desarrolladas,
      };
    } catch (error) {
      this.logger.error(`Error reading ideas from MongoDB: ${error.message}`);
      return { totalIdeas: 0, enDesarrollo: 0, pendientes: 0, completadas: 0 };
    }
  }

  /**
   * Get all unique tags from ideas collection in MongoDB for autocomplete
   *
   * @returns List of unique tags sorted alphabetically
   */
  async getAvailableTags(): Promise<{ tags: string[] }> {
    try {
      return await this.ideasService.getAllTags();
    } catch (error) {
      this.logger.error(`Error reading tags from MongoDB: ${error.message}`);
      return { tags: [] };
    }
  }
}
