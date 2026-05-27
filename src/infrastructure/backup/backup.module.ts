import { Module } from '@nestjs/common';
import { BackupConfigService } from './backup-config.service';
import { BackupService } from './backup.service';
import { NotificationModule } from '../../domains/notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [BackupConfigService, BackupService],
  exports: [BackupService],
})
export class BackupModule {}
