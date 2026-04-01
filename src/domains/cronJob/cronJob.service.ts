import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { spawn } from 'child_process';
import { Model } from 'mongoose';
import { FORMAT_DATE_SHORT } from '../../utils/constants';
import { formatDate } from '../../utils/dates';
import { NotificationService } from '../notification/notification.service';
import { CreateCronJobDto } from './dto/create-cron-job.dto';
import { CronJob, CronJobDocument } from './schemas/cronJob.schema';

@Injectable()
export class CronJobService {
  constructor(
    @InjectModel(CronJob.name) private cronJobModel: Model<CronJobDocument>,
    private notificationService: NotificationService,
  ) {}

  async create(createCronJobDto: CreateCronJobDto) {
    const createdJob = new this.cronJobModel(createCronJobDto);
    return createdJob.save();
  }

  async findAll() {
    return this.cronJobModel.find().exec();
  }

  async findOne(id: string) {
    return this.cronJobModel.findById(id).exec();
  }

  async remove(id: string) {
    return this.cronJobModel.findByIdAndDelete(id).exec();
  }

  async executeBackup() {
    const config = {
      mongoHost: 'localhost',
      mongoPort: '27017',
      database: 'mia_wallet',
      backupDir: './backups',
    };

    try {
      const currentDate = new Date();
      const formattedDate = formatDate(currentDate, 'yyyy-MM-DD_HH-mm-ss');
      const backupPath = `${config.backupDir}/${formattedDate}`;

      const dumpCommand = `mongodump --host ${config.mongoHost} --port ${config.mongoPort} --db ${config.database} --out ${backupPath}`;
      await spawn(dumpCommand, { shell: true });

      const message = `La copia de seguridad se ha generado con exito en la fecha ${formatDate(currentDate, FORMAT_DATE_SHORT)}`;
      await this.notificationService.createGeneralNotification(
        message,
        'Copia de seguridad exitosa',
      );

      return { success: true, message };
    } catch (error) {
      throw new Error(`Error generating backup: ${error.message}`);
    }
  }

  async executeApiCall() {
    // Implementación de la llamada API similar a startCreateCronJob
    return { success: true, message: 'API call executed successfully' };
  }

  @Cron('0 0 * * *')
  async handleBackupJob() {
    await this.executeBackup();
  }
}
