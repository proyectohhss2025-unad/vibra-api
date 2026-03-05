import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { EmotionsService } from './emotions.service';

@Controller('api/emotions')
export class EmotionsController {
    constructor(private readonly emotionsService: EmotionsService) { }

    @Post()
    async create(@Body() createEmotionDto: any) {
        return this.emotionsService.create(createEmotionDto);
    }

    @Get()
    async findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10
    ) {
        return this.emotionsService.findAll(page, limit);
    }

    @Get(':name')
    async findOne(@Param('name') name: string) {
        return this.emotionsService.findByName(name);
    }
}