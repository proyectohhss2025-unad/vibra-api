import { Module } from '@nestjs/common';
import { ThrottlerExceptionFilter } from './throttler-exception.filter';
import { LoggerModule } from '../../helpers/logger/logger.module';

@Module({
    imports: [LoggerModule],
    providers: [ThrottlerExceptionFilter],
    exports: [ThrottlerExceptionFilter],
})
export class ExceptionsModule { }