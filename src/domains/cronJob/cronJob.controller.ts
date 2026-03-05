import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CronJobService } from './cronJob.service';
import { CreateCronJobDto } from './dto/create-cron-job.dto';

@Controller('cron-jobs')
export class CronJobController {
    constructor(private readonly cronJobService: CronJobService) { }

    @Post()
    create(@Body() createCronJobDto: CreateCronJobDto) {
        return this.cronJobService.create(createCronJobDto);
    }

    @Get()
    findAll() {
        return this.cronJobService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.cronJobService.findOne(id);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.cronJobService.remove(id);
    }

    @Post('execute-backup')
    executeBackup() {
        return this.cronJobService.executeBackup();
    }

    @Post('execute-api-call')
    executeApiCall() {
        return this.cronJobService.executeApiCall();
    }
}