import { Controller, Post, Body, Get, Query, Param, Delete, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Controller('api/notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Post()
    async create(@Body() createNotificationDto: CreateNotificationDto) {
        return this.notificationService.create(createNotificationDto);
    }

    @Post('batch')
    async createMany(@Body() createNotificationDtos: CreateNotificationDto[]) {
        return this.notificationService.createMany(createNotificationDtos);
    }

    @Get()
    async findAll(@Query() query: any) {
        return this.notificationService.findAll(query);
    }

    @Get('count-all-notifications')
    async findCountAll(@Query() query: any) {
        return this.notificationService.getCountAll(query);
    }

    @Get('count-all-notifications-by-day')
    async findCountAllByDay(@Query() query: any) {
        return this.notificationService.getCountAllByDay(query);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.notificationService.getById(id);
    }

    @Get('title/:title')
    async findByTitle(@Param('title') title: string) {
        return this.notificationService.getByTitle(title);
    }

    @Post('batch/upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadBatch(@UploadedFile() file: Express.Multer.File) {
        return this.notificationService.bulkCreate(file);
    }

    @Get('search/:term')
    async search(@Param('term') term: string) {
        return this.notificationService.search(term);
    }

    @Put('read/:id')
    async markAsRead(@Param('id') id: string, @Body('editedBy') editedBy: string) {
        return this.notificationService.markAsRead(id, editedBy);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() updateNotificationDto: UpdateNotificationDto) {
        return this.notificationService.update(id, updateNotificationDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.notificationService.remove(id);
    }
}