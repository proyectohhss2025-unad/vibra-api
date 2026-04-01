import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiTags
} from '@nestjs/swagger';
import { AppLoggerService } from 'src/helpers/logger/logger.service';
import { CreateTranslateDto } from './dto/create-translate.dto';
import { FilterTranslateDto } from './dto/filter-translate.dto';
import { SeedTranslationsDto } from './dto/seed-translations.dto';
import { TranslateSeveralTextsDto } from './dto/translate-several-texts.dto';
import { UpdateTranslateDto } from './dto/update-translate.dto';
import { TranslateService } from './translate.service';

class TranslateDto {
  @ApiProperty()
  _id: string;

  @ApiProperty({ example: 'es' })
  language: string;

  @ApiProperty({ example: { HELLO: 'Hola' } })
  translations: Record<string, string>;
}

class TranslateDetectLanguageDto {
  @ApiProperty({ example: 'es' })
  language: string;
}

class TranslateTextResultDto {
  @ApiProperty({ example: 'Hola' })
  translatedText: string;
}

@ApiTags('Translates')
@Controller('api/translates')
export class TranslateController {
  constructor(
    private readonly translateService: TranslateService,
    private readonly logger: AppLoggerService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear traducciones por idioma' })
  @ApiBody({ type: CreateTranslateDto })
  @ApiOkResponse({ description: 'Traducción creada.', type: TranslateDto })
  create(@Body() createTranslateDto: CreateTranslateDto) {
    return this.translateService.create(createTranslateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar traducciones' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'language', required: false, example: 'es' })
  @ApiOkResponse({ description: 'Listado de traducciones.', schema: { type: 'array', items: { type: 'object' } } })
  findAll(@Query() filterDto: FilterTranslateDto) {
    return this.translateService.findAll(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener traducción por id' })
  @ApiParam({ name: 'id', description: 'ID del registro.' })
  @ApiOkResponse({ description: 'Traducción encontrada.', type: TranslateDto })
  findOne(@Param('id') id: string) {
    return this.translateService.findOne(id);
  }

  @Get('language/:language')
  @ApiOperation({ summary: 'Listar traducciones por idioma' })
  @ApiParam({ name: 'language', description: 'Código de idioma.', example: 'es' })
  @ApiOkResponse({ description: 'Traducciones del idioma.', schema: { type: 'array', items: { type: 'object' } } })
  findByLanguage(@Param('language') language: string) {
    return this.translateService.findByLanguage(language);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar traducción' })
  @ApiParam({ name: 'id', description: 'ID del registro.' })
  @ApiBody({ type: UpdateTranslateDto })
  @ApiOkResponse({ description: 'Traducción actualizada.', type: TranslateDto })
  update(
    @Param('id') id: string,
    @Body() updateTranslateDto: UpdateTranslateDto,
  ) {
    return this.translateService.update(id, updateTranslateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar traducción' })
  @ApiParam({ name: 'id', description: 'ID del registro.' })
  @ApiQuery({ name: 'deletedBy', required: true, example: 'admin' })
  @ApiOkResponse({ description: 'Traducción eliminada.', type: TranslateDto })
  remove(@Param('id') id: string, @Query('deletedBy') deletedBy: string) {
    return this.translateService.remove(id, deletedBy);
  }

  @Get('translate/:language/:text')
  @ApiOperation({ summary: 'Traducir un texto (por path params)' })
  @ApiParam({ name: 'language', description: 'Idioma destino.', example: 'es' })
  @ApiParam({ name: 'text', description: 'Texto a traducir.', example: 'Hello' })
  @ApiOkResponse({ description: 'Texto traducido.', type: TranslateTextResultDto })
  translateText(
    @Param('language') language: string,
    @Param('text') text: string,
  ) {
    return this.translateService.translateText(language, text);
  }

  @Get('detect-language')
  @ApiOperation({ summary: 'Detectar idioma de un texto' })
  @ApiQuery({ name: 'text', required: true, example: 'Hola mundo' })
  @ApiOkResponse({ description: 'Idioma detectado.', type: TranslateDetectLanguageDto })
  detectLanguage(@Query('text') text: string) {
    return this.translateService.detectLanguage(text);
  }

  @Post('translate')
  @ApiOperation({ summary: 'Traducir un texto (body)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { text: { type: 'string' }, targetLanguage: { type: 'string' } },
      required: ['text', 'targetLanguage'],
    },
  })
  @ApiOkResponse({ description: 'Texto traducido.', type: TranslateTextResultDto })
  translateSingleText(@Body() body: { text: string; targetLanguage: string }) {
    return this.translateService.translateSingleText(
      body.text,
      body.targetLanguage,
    );
  }

  @Post('translate-several')
  @ApiOperation({ summary: 'Traducir varios textos' })
  @ApiBody({ type: TranslateSeveralTextsDto })
  @ApiOkResponse({ description: 'Textos traducidos.', schema: { type: 'object' } })
  translateSeveralTexts(
    @Body() translateSeveralTextsDto: TranslateSeveralTextsDto,
  ) {
    return this.translateService.translateSeveralTexts(
      translateSeveralTextsDto.texts,
      translateSeveralTextsDto.targetLanguage,
    );
  }

  @Post('seed')
  @ApiOperation({ summary: 'Sembrar traducciones (seed)' })
  @ApiBody({ type: SeedTranslationsDto })
  @ApiOkResponse({ description: 'Seed completado.', schema: { type: 'object' } })
  seedTranslations(@Body() seedDto: SeedTranslationsDto) {
    this.logger.log(`Seed DTO:... ${seedDto}`);
    return this.translateService.seedTranslations(seedDto.translations);
  }

  @Get('text/:text')
  @ApiOperation({ summary: 'Buscar traducciones por texto' })
  @ApiParam({ name: 'text', description: 'Texto llave/busqueda.', example: 'HELLO' })
  @ApiOkResponse({ description: 'Traducciones encontradas.', schema: { type: 'array', items: { type: 'object' } } })
  findTranslationsByText(@Param('text') text: string) {
    return this.translateService.findByText(text);
  }

  @Get('language/:language/text/:text')
  @ApiOperation({ summary: 'Buscar traducción por idioma y texto' })
  @ApiParam({ name: 'language', description: 'Código de idioma.', example: 'es' })
  @ApiParam({ name: 'text', description: 'Texto llave.', example: 'HELLO' })
  @ApiOkResponse({ description: 'Traducción encontrada.', schema: { type: 'object' } })
  findTranslation(
    @Param('language') language: string,
    @Param('text') text: string,
  ) {
    return this.translateService.findTranslation(language, text);
  }
}
