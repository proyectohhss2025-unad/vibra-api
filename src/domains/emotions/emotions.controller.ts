import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
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
import { CreateEmotionDto } from './dto/create-emotion.dto';
import { EmotionsService } from './emotions.service';

class EmotionDto {
  @ApiProperty({ example: '66c9cce47e6a95e98116c0ab' })
  _id: string;

  @ApiProperty({ example: 'EMO-001' })
  id: string;

  @ApiProperty({ example: 'Alegría' })
  name: string;

  @ApiPropertyOptional({
    example: 'Respira y comparte algo positivo con tu grupo.',
  })
  orientationNote?: string;

  @ApiPropertyOptional({ example: 'Estado emocional asociado a bienestar.' })
  description?: string;

  @ApiProperty({ example: 'joy.png' })
  icono: string;

  @ApiProperty({ example: 25 })
  percentNote: number;
}

class EmotionsPaginatedDto {
  @ApiProperty({ type: [EmotionDto] })
  data: EmotionDto[];

  @ApiProperty({ example: 27 })
  total: number;
}

@ApiTags('Emotions')
@Controller('api/emotions')
export class EmotionsController {
  constructor(private readonly emotionsService: EmotionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una emoción',
    description:
      'Crea una emoción para el catálogo del dashboard Vibra (usada en actividades y visualizaciones).',
  })
  @ApiBody({ type: CreateEmotionDto })
  @ApiCreatedResponse({
    description: 'Emoción creada correctamente.',
    type: EmotionDto,
  })
  async create(@Body() createEmotionDto: CreateEmotionDto) {
    return this.emotionsService.create(createEmotionDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar emociones (paginado)',
    description:
      'Obtiene el catálogo de emociones con paginación. Retorna { data, total }.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({
    description: 'Catálogo de emociones.',
    type: EmotionsPaginatedDto,
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.emotionsService.findAll(page, limit);
  }

  @Get(':name')
  @ApiOperation({
    summary: 'Consultar una emoción por nombre',
    description:
      'Obtiene el detalle de una emoción por su nombre exacto (campo name).',
  })
  @ApiParam({ name: 'name', description: 'Nombre de la emoción.', example: 'Alegría' })
  @ApiOkResponse({ description: 'Emoción encontrada.', type: EmotionDto })
  @ApiNotFoundResponse({ description: 'Emoción no encontrada.' })
  async findOne(@Param('name') name: string) {
    const emotion = await this.emotionsService.findByName(name);
    if (!emotion) {
      throw new NotFoundException(`Emoción con nombre ${name} no encontrada`);
    }
    return emotion;
  }
}
