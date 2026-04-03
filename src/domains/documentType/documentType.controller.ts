import { Body, Controller, Get, Param, Post, Query, Delete } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';
import { DocumentTypeService } from './documentType.service';

class DocumentTypeDto {
  @ApiProperty({
    description: 'Identificador del tipo de documento.',
    example: '66c9cce47e6a95e98116c0ab',
  })
  _id: string;

  @ApiProperty({
    description: 'Nombre o sigla del tipo de documento.',
    example: 'CC',
  })
  name: string;

  @ApiProperty({
    description: 'Descripción completa.',
    example: 'Cédula de Ciudadanía',
  })
  description: string;

  @ApiPropertyOptional({
    description: 'Serial o código interno.',
    example: '01',
  })
  serial?: string;

  @ApiProperty({
    description: 'Estado de activación.',
    example: true,
  })
  isActive: boolean;
}

@ApiTags('Document Types')
@Controller('api/document-types')
export class DocumentTypeController {
  constructor(private readonly documentTypeService: DocumentTypeService) { }

  @Post('create')
  @ApiOperation({
    summary: 'Crear un tipo de documento',
    description: 'Registra un nuevo tipo de documento en el sistema.',
  })
  @ApiBody({
    type: CreateDocumentTypeDto,
    description: 'Datos requeridos para el nuevo tipo de documento.',
  })
  @ApiCreatedResponse({
    description: 'Tipo de documento creado con éxito.',
    type: DocumentTypeDto,
  })
  async create(@Body() createDocumentTypeDto: CreateDocumentTypeDto) {
    return this.documentTypeService.create(createDocumentTypeDto);
  }

  @Post()
  @ApiOperation({
    summary: 'Actualizar un tipo de documento',
    description: 'Actualiza los datos de un tipo de documento existente por su _id.',
  })
  @ApiBody({
    type: UpdateDocumentTypeDto,
    description: 'Datos a actualizar.',
  })
  @ApiOkResponse({
    description: 'Registro actualizado correctamente.',
    type: DocumentTypeDto,
  })
  @ApiNotFoundResponse({
    description: 'Tipo de documento no encontrado.',
  })
  async update(@Body() updateDocumentTypeDto: UpdateDocumentTypeDto) {
    return this.documentTypeService.update(updateDocumentTypeDto);
  }

  @Get('all')
  @ApiOperation({
    summary: 'Listar tipos de documento',
    description: 'Obtiene todos los tipos de documento activos.',
  })
  @ApiOkResponse({
    description: 'Listado obtenido exitosamente.',
    type: [DocumentTypeDto],
  })
  async findAll() {
    return this.documentTypeService.findAll();
  }

  @Get('count-all')
  @ApiOperation({
    summary: 'Contar tipos de documento',
    description: 'Obtiene el total de tipos de documento registrados.',
  })
  @ApiOkResponse({
    description: 'Conteo realizado con éxito.',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5 },
      },
    },
  })
  async findCountAll(@Query() query: any) {
    return this.documentTypeService.getCountAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar por ID',
    description: 'Obtiene el detalle de un tipo de documento por su identificador único.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de base de datos.',
    example: '66c9cce47e6a95e98116c0ab',
  })
  @ApiOkResponse({
    description: 'Documento encontrado.',
    type: DocumentTypeDto,
  })
  @ApiNotFoundResponse({
    description: 'Documento no encontrado.',
  })
  async findOne(@Param('id') id: string) {
    return this.documentTypeService.findOne(id);
  }

  @Get('search/:name')
  @ApiOperation({
    summary: 'Buscar por nombre',
    description: 'Busca un tipo de documento por su nombre exacto.',
  })
  @ApiParam({
    name: 'name',
    description: 'Nombre o sigla (ej. CC).',
    example: 'CC',
  })
  @ApiOkResponse({
    description: 'Documento encontrado.',
    type: DocumentTypeDto,
  })
  async findByName(@Param('name') name: string) {
    return this.documentTypeService.findByName(name);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar tipo de documento',
    description: 'Realiza un borrado lógico del documento en el sistema.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID a eliminar.',
  })
  async remove(@Param('id') id: string, @Query('deletedBy') deletedBy: string) {
    return this.documentTypeService.remove(id, deletedBy);
  }
}

