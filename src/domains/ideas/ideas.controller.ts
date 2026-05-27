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
import { BypassPermission } from 'src/infrastructure/auth/bypass-permission.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { CreateIdeaDto, UpdateIdeaDto } from './dto/create-idea.dto';
import { IdeasService } from './ideas.service';

class IdeaResponseDto {
  @ApiProperty({ example: '66c9cce47e6a95e98116c0ab' })
  _id: string;

  @ApiProperty({ example: 'vibra-100' })
  id: string;

  @ApiProperty({ example: 'Implementar nueva funcionalidad' })
  descripcion: string;

  @ApiPropertyOptional({ example: '' })
  detalle?: string;

  @ApiProperty({ example: ['feature', 'ux'] })
  tags: string[];

  @ApiProperty({ enum: ['alta', 'media', 'baja'], example: 'media' })
  prioridad: string;

  @ApiProperty({ enum: ['pendiente', 'en_desarrollo', 'desarrollada'], example: 'pendiente' })
  estado: string;

  @ApiProperty({ example: null })
  requerimiento: any;

  @ApiProperty({
    example: {
      creacion: '2026-05-26T00:00:00.000Z',
      modificacion: '2026-05-26T00:00:00.000Z',
      desarrollo_inicio: null,
      desarrollo_fin: null,
    },
  })
  fechas: any;

  @ApiProperty({
    example: [
      { fecha: '2026-05-26T00:00:00.000Z', accion: 'creada', detalle: 'Idea creada' },
    ],
  })
  historial: any[];
}

class IdeasPaginatedDto {
  @ApiProperty({ type: [IdeaResponseDto] })
  data: IdeaResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;
}

class EstadisticasDto {
  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 20 })
  desarrolladas: number;

  @ApiProperty({ example: 5 })
  en_desarrollo: number;

  @ApiProperty({ example: 25 })
  pendientes: number;

  @ApiProperty({ example: { alta: 15, media: 25, baja: 10 } })
  por_prioridad: Record<string, number>;
}

@ApiTags('Ideas')
@Controller('api/ideas')
@RequirePermission('0')
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva idea' })
  @ApiBody({ type: CreateIdeaDto })
  @ApiCreatedResponse({ description: 'Idea creada.', type: IdeaResponseDto })
  async create(@Body() createIdeaDto: CreateIdeaDto) {
    return this.ideasService.create(createIdeaDto);
  }

  @BypassPermission()
  @Get()
  @ApiOperation({ summary: 'Listar ideas (paginado con filtros)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'estado', required: false, enum: ['pendiente', 'en_desarrollo', 'desarrollada'] })
  @ApiQuery({ name: 'prioridad', required: false, enum: ['alta', 'media', 'baja'] })
  @ApiQuery({ name: 'tag', required: false, description: 'Filtrar por tag' })
  @ApiOkResponse({ description: 'Lista paginada de ideas.', type: IdeasPaginatedDto })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('estado') estado?: string,
    @Query('prioridad') prioridad?: string,
    @Query('tag') tag?: string,
  ) {
    return this.ideasService.findAll(page, limit, estado, prioridad, tag);
  }

  @BypassPermission()
  @Get('estadisticas')
  @ApiOperation({ summary: 'Estadísticas del backlog de ideas' })
  @ApiOkResponse({ description: 'Estadísticas.', type: EstadisticasDto })
  async getEstadisticas() {
    return this.ideasService.getEstadisticas();
  }

  @BypassPermission()
  @Get('buscar')
  @ApiOperation({ summary: 'Buscar ideas por texto' })
  @ApiQuery({ name: 'q', required: true, description: 'Texto de búsqueda' })
  @ApiOkResponse({ description: 'Ideas encontradas.', type: [IdeaResponseDto] })
  async buscar(@Query('q') q: string) {
    return this.ideasService.buscar(q);
  }

  @BypassPermission()
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una idea por su ID personalizado' })
  @ApiParam({ name: 'id', description: 'ID personalizado de la idea (ej: vibra-100)', example: 'vibra-100' })
  @ApiOkResponse({ description: 'Idea encontrada.', type: IdeaResponseDto })
  @ApiNotFoundResponse({ description: 'Idea no encontrada.' })
  async findById(@Param('id') id: string) {
    return this.ideasService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una idea' })
  @ApiParam({ name: 'id', description: 'ID personalizado de la idea' })
  @ApiBody({ type: UpdateIdeaDto })
  @ApiOkResponse({ description: 'Idea actualizada.', type: IdeaResponseDto })
  async update(
    @Param('id') id: string,
    @Body() updateIdeaDto: UpdateIdeaDto,
  ) {
    return this.ideasService.update(id, updateIdeaDto);
  }

  @Put(':id/estado')
  @ApiOperation({ summary: 'Cambiar estado de una idea' })
  @ApiParam({ name: 'id', description: 'ID personalizado de la idea' })
  @ApiQuery({ name: 'estado', required: true, enum: ['pendiente', 'en_desarrollo', 'desarrollada'] })
  @ApiOkResponse({ description: 'Estado actualizado.', type: IdeaResponseDto })
  async updateEstado(
    @Param('id') id: string,
    @Query('estado') estado: string,
    @Query('detalle') detalle?: string,
  ) {
    return this.ideasService.updateEstado(id, estado, detalle);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una idea' })
  @ApiParam({ name: 'id', description: 'ID personalizado de la idea' })
  @ApiOkResponse({ description: 'Idea eliminada.', type: IdeaResponseDto })
  async remove(@Param('id') id: string) {
    return this.ideasService.remove(id);
  }
}
