import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { BackupService } from '../../infrastructure/backup/backup.service';
import { NotificationService } from '../notification/notification.service';
import { CreateCronJobDto } from './dto/create-cron-job.dto';
import { CronJob, CronJobDocument } from './schemas/cronJob.schema';

@Injectable()
export class CronJobService {
  constructor(
    @InjectModel(CronJob.name) private cronJobModel: Model<CronJobDocument>,
    private backupService: BackupService,
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
    return this.backupService.executeBackup();
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
