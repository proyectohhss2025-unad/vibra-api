import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TranslateService } from './translate.service';
import { CreateTranslateDto } from './dto/create-translate.dto';
import { UpdateTranslateDto } from './dto/update-translate.dto';
import { FilterTranslateDto } from './dto/filter-translate.dto';
import { TranslateSeveralTextsDto } from './dto/translate-several-texts.dto';
import { SeedTranslationsDto } from './dto/seed-translations.dto';
import { AppLoggerService } from 'src/helpers/logger/logger.service';

@Controller('api/translates')
export class TranslateController {
    constructor(private readonly translateService: TranslateService,
        private readonly logger: AppLoggerService) { }

    @Post()
    create(@Body() createTranslateDto: CreateTranslateDto) {
        return this.translateService.create(createTranslateDto);
    }

    @Get()
    findAll(@Query() filterDto: FilterTranslateDto) {
        return this.translateService.findAll(filterDto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.translateService.findOne(id);
    }

    @Get('language/:language')
    findByLanguage(@Param('language') language: string) {
        return this.translateService.findByLanguage(language);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateTranslateDto: UpdateTranslateDto) {
        return this.translateService.update(id, updateTranslateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Query('deletedBy') deletedBy: string) {
        return this.translateService.remove(id, deletedBy);
    }

    @Get('translate/:language/:text')
    translateText(
        @Param('language') language: string,
        @Param('text') text: string,
    ) {
        return this.translateService.translateText(language, text);
    }

    @Get('detect-language')
    detectLanguage(@Query('text') text: string) {
        return this.translateService.detectLanguage(text);
    }

    @Post('translate')
    translateSingleText(
        @Body() body: { text: string; targetLanguage: string }
    ) {
        return this.translateService.translateSingleText(body.text, body.targetLanguage);
    }

    @Post('translate-several')
    translateSeveralTexts(@Body() translateSeveralTextsDto: TranslateSeveralTextsDto) {
        return this.translateService.translateSeveralTexts(
            translateSeveralTextsDto.texts,
            translateSeveralTextsDto.targetLanguage
        );
    }

    @Post('seed')
    seedTranslations(@Body() seedDto: SeedTranslationsDto) {
        this.logger.log(`Seed DTO:... ${seedDto}`);
        return this.translateService.seedTranslations(seedDto.translations);
    }

    @Get('text/:text')
    findTranslationsByText(@Param('text') text: string) {
        return this.translateService.findByText(text);
    }

    @Get('language/:language/text/:text')
    findTranslation(@Param('language') language: string, @Param('text') text: string) {
        return this.translateService.findTranslation(language, text);
    }
}