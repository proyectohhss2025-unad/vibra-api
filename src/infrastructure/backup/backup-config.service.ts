import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BackupConfig {
  mongoHost: string;
  mongoPort: string;
  database: string;
  backupDir: string;
  authDb: string;
  username: string;
  password: string;
}

@Injectable()
export class BackupConfigService {
  constructor(private configService: ConfigService) {}

  get config(): BackupConfig {
    return {
      mongoHost: this.configService.get<string>('BACKUP_MONGO_HOST', 'localhost'),
      mongoPort: this.configService.get<string>('BACKUP_MONGO_PORT', '27017'),
      database: this.configService.get<string>('BACKUP_DATABASE', 'vibra_db'),
      backupDir: this.configService.get<string>('BACKUP_DIR', './backups'),
      authDb: this.configService.get<string>('BACKUP_AUTH_DB', 'admin'),
      username: this.configService.get<string>('BACKUP_USERNAME', ''),
      password: this.configService.get<string>('BACKUP_PASSWORD', ''),
    };
  }

  get hasAuth(): boolean {
    return !!(this.config.username && this.config.password);
  }
}
