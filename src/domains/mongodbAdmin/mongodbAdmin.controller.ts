import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MongoDBAdminService } from './mongodbAdmin.service';

export interface CloneDatabaseDto {
  originDatabaseName: string;
  destinationDatabaseName: string;
}

@Controller('mongodb-admin')
export class MongoDBAdminController {
  constructor(private readonly mongoDBAdminService: MongoDBAdminService) {}

  @Post('clone')
  async cloneDatabase(@Body() body: CloneDatabaseDto) {
    try {
      await this.mongoDBAdminService.cloneDatabase(
        body.originDatabaseName,
        body.destinationDatabaseName,
      );
      return { message: 'Clone successful' };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Error cloning database',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('databases')
  async getDatabases() {
    try {
      const databases = await this.mongoDBAdminService.getDatabases();
      return { message: 'Load successful', databases };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Error getting databases',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
