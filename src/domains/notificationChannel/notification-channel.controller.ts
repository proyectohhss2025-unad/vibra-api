import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateNotificationChannelDto } from './dto/create-notification-channel.dto';
import { UpdateNotificationChannelDto } from './dto/update-notification-channel.dto';
import { NotificationChannelService } from './notification-channel.service';

@Controller('notification-channels')
export class NotificationChannelController {
    constructor(private readonly notificationChannelService: NotificationChannelService) { }

    @Post()
    async create(@Body() createNotificationChannelDto: CreateNotificationChannelDto) {
        return this.notificationChannelService.create(createNotificationChannelDto);
    }

    @Get()
    async findAll() {
        return this.notificationChannelService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.notificationChannelService.findOne(id);
    }

    @Get('by-title/:title')
    async findByTitle(@Param('title') title: string) {
        return this.notificationChannelService.findByTitle(title);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() updateNotificationChannelDto: UpdateNotificationChannelDto,
    ) {
        return this.notificationChannelService.update(id, updateNotificationChannelDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.notificationChannelService.remove(id);
    }

    @Post('bulk')
    async createMany(@Body() createNotificationChannelDtos: CreateNotificationChannelDto[]) {
        return this.notificationChannelService.createMany(createNotificationChannelDtos);
    }
}