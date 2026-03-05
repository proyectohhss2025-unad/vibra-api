import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { ActivityResponseDto } from './dto/activity-response.dto';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('api/activities')
export class ActivitiesController {
    constructor(private readonly activitiesService: ActivitiesService) { }

    @Post()
    create(@Body() createActivityDto: CreateActivityDto) {
        return this.activitiesService.create(createActivityDto);
    }

    @Get()
    findAll(
        @Query('emotion') emotion: string,
        @Query('userId') userId: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        //console.log({ page, limit, userId, emotion });
        return this.activitiesService.paginate({ page, limit }, userId, emotion == 'all' ? {} : { emotion });
    }

    @Get('all')
    findAllWithPaginate(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.activitiesService.paginate({ page, limit }, null, {});
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.activitiesService.findById(id);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateActivityDto: UpdateActivityDto) {
        return this.activitiesService.update(id, updateActivityDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.activitiesService.softDelete(id);
    }

    @Get('emotions/list')
    getAvailableEmotions() {
        return this.activitiesService.getAvailableEmotions();
    }

    @Get('daily/current')
    getDailyActivity() {
        return this.activitiesService.getTodaysActivity();
    }

    @Post(':id/:userId/submit')
    submitResponse(
        @Param('id') activityId: string,
        @Param('userId') userId: string,
        @Body() responseDto: ActivityResponseDto,
    ) {
        return this.activitiesService.processResponse(
            userId,
            activityId,
            responseDto
        );
    }
}