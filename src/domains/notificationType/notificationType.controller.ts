import { Body, Controller, Delete, Get, Param, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateNotificationTypeDto } from './dto/create-notificationType.dto';
import { UpdateNotificationTypeDto } from './dto/update-notificationType.dto';
import { NotificationTypeService } from './notificationType.service';

@Controller('notification-types')
export class NotificationTypeController {
    constructor(private readonly notificationTypeService: NotificationTypeService) { }

    @Post()
    create(@Body() createNotificationTypeDto: CreateNotificationTypeDto) {
        return this.notificationTypeService.create(createNotificationTypeDto);
    }

    @Post('bulk')
    @UseInterceptors(FileInterceptor('file'))
    bulkCreate(@UploadedFile() file: Express.Multer.File) {
        return this.notificationTypeService.bulkCreate(file);
    }

    @Get()
    findAll() {
        return this.notificationTypeService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.notificationTypeService.findOne(id);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateNotificationTypeDto: UpdateNotificationTypeDto) {
        return this.notificationTypeService.update(id, updateNotificationTypeDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.notificationTypeService.remove(id);
    }
}