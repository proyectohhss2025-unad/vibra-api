import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { ParticipantService } from './participant.service';

class ParticipantDto {
  @ApiProperty({ example: '66c9cce47e6a95e98116c0ab' })
  _id: string;

  @ApiProperty({ example: 'Institución Demo' })
  name: string;

  @ApiProperty({ example: '900123456-7' })
  nit: string;

  @ApiPropertyOptional({ example: 'EPS001' })
  epsCode?: string;

  @ApiPropertyOptional({ example: 'Calle 123 # 45-67' })
  address?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'contacto@institucion.local' })
  email?: string;

  @ApiPropertyOptional({ example: true })
  isActive?: boolean;
}

class ParticipantsListDto {
  @ApiProperty({ type: [ParticipantDto] })
  participants: ParticipantDto[];

  @ApiProperty({ example: 120 })
  count: number;
}

@ApiTags('Participants')
@ApiBearerAuth()
@Controller('api/participants')
export class ParticipantController {
  constructor(private readonly participantService: ParticipantService) {}

  @Post()
  @ApiOperation({ summary: 'Crear participante' })
  @ApiBody({ type: CreateParticipantDto })
  @ApiCreatedResponse({ description: 'Participante creado.', type: ParticipantDto })
  create(@Body() createParticipantDto: CreateParticipantDto) {
    return this.participantService.create(createParticipantDto);
  }

  @Post('bulk')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Carga masiva de participantes (CSV)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOkResponse({ description: 'Participantes creados desde archivo.' })
  createMany(@UploadedFile() file: Express.Multer.File) {
    return this.participantService.createMany(file);
  }

  @Get()
  @ApiOperation({ summary: 'Listar participantes' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'rows', required: false, example: 10 })
  @ApiOkResponse({ description: 'Listado de participantes.', type: ParticipantsListDto })
  findAll(@Query() query: any) {
    return this.participantService.findAll(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar participantes' })
  @ApiQuery({ name: 'searchTerm', required: true, example: 'demo' })
  @ApiOkResponse({ description: 'Resultados de búsqueda.', schema: { type: 'array', items: { type: 'object' } } })
  search(@Query('searchTerm') searchTerm: string) {
    return this.participantService.search(searchTerm);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener participante por id' })
  @ApiParam({ name: 'id', description: 'ID del participante.' })
  @ApiOkResponse({ description: 'Participante encontrado.', type: ParticipantDto })
  findOne(@Param('id') id: string) {
    return this.participantService.findOne(id);
  }

  @Post('update')
  @ApiOperation({ summary: 'Actualizar participante' })
  @ApiBody({ type: UpdateParticipantDto })
  @ApiOkResponse({ description: 'Participante actualizado.', type: ParticipantDto })
  update(@Body() updateParticipantDto: UpdateParticipantDto) {
    return this.participantService.update(updateParticipantDto);
  }

  @Post('delete')
  @ApiOperation({ summary: 'Eliminar participante' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { _id: { type: 'string', example: '66c9cce47e6a95e98116c0ab' } },
      required: ['_id'],
    },
  })
  @ApiOkResponse({ description: 'Participante eliminado.', type: ParticipantDto })
  remove(@Body('_id') id: string) {
    return this.participantService.remove(id);
  }

  @Get('filter')
  @ApiOperation({ summary: 'Listar participantes por rango de fechas' })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-01-31' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiOkResponse({ description: 'Listado filtrado.', type: ParticipantsListDto })
  findAllWithDateFilter(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    const query: any = {};

    if (startDate || endDate) {
      query.dateFilter = {};
      if (startDate) query.dateFilter.startDate = new Date(startDate);
      if (endDate) query.dateFilter.endDate = new Date(endDate);
    }

    if (limit) query.limit = Number(limit);

    return this.participantService.findAll(query);
  }

  @Get('paginated')
  @ApiOperation({ summary: 'Listar participantes (paginado)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({ description: 'Listado paginado.', type: ParticipantsListDto })
  findAllPaginated(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const query: any = {};

    if (page) query.page = Number(page);
    if (limit) query.rows = Number(limit);

    return this.participantService.findAll(query);
  }
}
