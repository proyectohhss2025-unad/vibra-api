import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { AppLoggerService } from 'src/helpers/logger/logger.service';
import {
  FORMAT_DATE_SHORT,
  NOTIFICATION_CHANNEL_INBOX,
  NOTIFICATION_TYPE_ALERT,
  NOTIFICATION_TYPE_INFO,
} from '../../utils/constants';
import { formatDate } from '../../utils/dates';
import { generateSerial } from '../../utils/string';
import { NotificationService } from '../notification/notification.service';
import { spawn } from 'child_process';

@Injectable()
export class AdminService {
  private logger = new AppLoggerService();

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    @InjectModel(File.name) private fileModel: Model<File>,
    @InjectModel(Report.name) private reportModel: Model<Report>,
    private notificationService: NotificationService,
  ) {}

  /**
   * Generate database backups
   *
   * @returns {Promise<string>} - Success message
   * @throws {Error} - If there is an error generating the backup
   */
  async generateBackups(user: any): Promise<string> {
    //INFO: generate backups DB
    const config = {
      mongoHost: 'localhost',
      mongoPort: '27017',
      database: 'dashboard',
      backupDir: './backups',
    };

    try {
      const currentDate = new Date();
      const formattedDate = formatDate(currentDate, 'yyyy-MM-DD_HH-mm-ss');
      const backupPath = `${config.backupDir}/${formattedDate}`;

      //NOTE: Generate backups
      const dumpCommand = `mongodump --host ${config.mongoHost} --port ${config.mongoPort} --db ${config.database} --out ${backupPath}`;
      await spawn(dumpCommand, { shell: true });

      const message = `La copia de seguridad se ha generado con exito en la fecha ${formatDate(currentDate, FORMAT_DATE_SHORT)}`;
      await this.notificationService.createGeneralNotification(
        message,
        'Copia de seguridad exitosa',
        user,
      );

      // sendEmail('Backup exitoso', `Se ha realizado un backup de la base de datos ${config.database}`);
      this.logger.log(message);
      return message;
    } catch (error) {
      this.logger.error(`Error generando la copia de seguridad. ${error}`);
      throw new Error('Error generando la copia de seguridad');
    }
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
}
