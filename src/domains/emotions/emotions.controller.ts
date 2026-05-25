import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { CreateEmotionDto, UpdateEmotionDto } from './dto/create-emotion.dto';
import { EmotionsService } from './emotions.service';

class EmotionDto {
  @ApiProperty({ example: '66c9cce47e6a95e98116c0ab' })
  _id: string;

  @ApiProperty({ example: 'EMO-001' })
  id: string;

  @ApiProperty({ example: 'Alegría' })
  name: string;

  @ApiPropertyOptional({ example: 'Respira y comparte algo positivo con tu grupo.' })
  orientationNote?: string;

  @ApiPropertyOptional({ example: 'Estado emocional asociado a bienestar.' })
  description?: string;

  @ApiProperty({ example: 'joy.png' })
  icono: string;

  @ApiProperty({ example: 25 })
  percentNote: number;

  @ApiPropertyOptional({ enum: ['Positiva', 'Negativa', 'Neutra', 'Basica', 'Compleja'], example: 'Positiva' })
  category?: string;

  @ApiPropertyOptional({ example: 7 })
  intensity?: number;

  @ApiProperty({ example: true })
  isActive: boolean;
}

class EmotionsPaginatedDto {
  @ApiProperty({ type: [EmotionDto] })
  data: EmotionDto[];

  @ApiProperty({ example: 27 })
  total: number;
}

@ApiTags('Emotions')
@Controller('api/emotions')
@RequirePermission('8')
export class EmotionsController {
  constructor(private readonly emotionsService: EmotionsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una emoción' })
  @ApiBody({ type: CreateEmotionDto })
  @ApiCreatedResponse({ description: 'Emoción creada.', type: EmotionDto })
  async create(@Body() createEmotionDto: CreateEmotionDto) {
    return this.emotionsService.create(createEmotionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar emociones (paginado)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({ description: 'Catálogo de emociones.', type: EmotionsPaginatedDto })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.emotionsService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una emoción por ID' })
  @ApiParam({ name: 'id', description: 'ID de la emoción (MongoDB _id).', example: '66c9cce47e6a95e98116c0ab' })
  @ApiOkResponse({ description: 'Emoción encontrada.', type: EmotionDto })
  @ApiNotFoundResponse({ description: 'Emoción no encontrada.' })
  async findById(@Param('id') id: string) {
    return this.emotionsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una emoción' })
  @ApiParam({ name: 'id', description: 'ID de la emoción.', example: '66c9cce47e6a95e98116c0ab' })
  @ApiBody({ type: UpdateEmotionDto })
  @ApiOkResponse({ description: 'Emoción actualizada.', type: EmotionDto })
  async update(
    @Param('id') id: string,
    @Body() updateEmotionDto: UpdateEmotionDto,
  ) {
    return this.emotionsService.update(id, updateEmotionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una emoción (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID de la emoción.', example: '66c9cce47e6a95e98116c0ab' })
  @ApiOkResponse({ description: 'Emoción desactivada.', type: EmotionDto })
  async remove(@Param('id') id: string) {
    return this.emotionsService.softDelete(id);
  }

  @Get('distribution')
  @ApiOperation({
    summary: 'Distribución de emociones registradas',
    description:
      'Retorna el conteo de respuestas agrupadas por emoción, para gráficas de distribución (donut/pastel).',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Fecha inicial (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Fecha final (ISO string)' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filtrar por curso' })
  @ApiOkResponse({
    description: 'Distribución de emociones.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Alegría' },
          value: { type: 'number', example: 120 },
          icono: { type: 'string', example: 'joy.png' },
        },
      },
    },
  })
  getDistribution(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.emotionsService.getDistribution(startDate, endDate, courseId);
  }

  @Get('evolution')
  @ApiOperation({
    summary: 'Evolución temporal de emociones',
    description:
      'Retorna el conteo de respuestas por día para los últimos N días. Útil para gráficas de líneas.',
  })
  @ApiQuery({ name: 'days', required: false, example: 30, description: 'Número de días hacia atrás (default: 30)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Fecha inicial (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Fecha final (ISO string)' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filtrar por curso' })
  @ApiOkResponse({
    description: 'Evolución de emociones por día.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', example: '2026-05-01' },
          count: { type: 'number', example: 15 },
        },
      },
    },
  })
  getEvolution(
    @Query('days') days?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.emotionsService.getEvolution(days ?? 30, startDate, endDate, courseId);
  }

  @Get('by-name/:name')
  @ApiOperation({ summary: 'Consultar una emoción por nombre' })
  @ApiParam({ name: 'name', description: 'Nombre exacto de la emoción.', example: 'Alegría' })
  @ApiOkResponse({ description: 'Emoción encontrada.', type: EmotionDto })
  @ApiNotFoundResponse({ description: 'Emoción no encontrada.' })
  async findByName(@Param('name') name: string) {
    const emotion = await this.emotionsService.findByName(name);
    if (!emotion) {
      throw new NotFoundException(`Emoción con nombre ${name} no encontrada`);
    }
    return emotion;
  }
}
