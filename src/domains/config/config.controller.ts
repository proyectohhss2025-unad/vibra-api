import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

class ConfigDto {
  @ApiProperty()
  _id: string;

  @ApiProperty({ example: 'FEATURE_PRETEST' })
  name: string;

  @ApiPropertyOptional({ example: 'Habilita el módulo de pretest.' })
  description?: string;

  @ApiProperty({ example: true })
  flag: boolean;

  @ApiPropertyOptional({ type: [String], example: ['admin'] })
  allowedUsers?: string[];

  @ApiPropertyOptional({ type: [String], example: ['blocked.user'] })
  disallowedUsers?: string[];

  @ApiPropertyOptional({ example: true })
  isActive?: boolean;
}

class ConfigsPaginatedDto {
  @ApiProperty({ type: [ConfigDto] })
  configs: ConfigDto[];

  @ApiProperty({ example: 50 })
  length: number;
}

@ApiTags('Config')
@Controller('api/config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Create a new configuration
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear configuración' })
  @ApiBody({ type: CreateConfigDto })
  @ApiCreatedResponse({ description: 'Configuración creada.', type: ConfigDto })
  async addConfig(@Body() createConfigDto: CreateConfigDto) {
    return this.configService.addConfig(createConfigDto);
  }

  /**
   * Get a configuration by ID
   */
  @Post('by-id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener configuración por id' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  })
  @ApiOkResponse({ description: 'Configuración encontrada.', type: ConfigDto })
  async getConfigById(@Body('id') id: string) {
    return this.configService.getConfigById(id);
  }

  /**
   * Get a configuration by name
   */
  @Post('by-name')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener configuración por nombre' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  })
  @ApiOkResponse({ description: 'Configuración encontrada.', type: ConfigDto })
  async getConfigByName(@Body('name') name: string) {
    return this.configService.getConfigByName(name);
  }

  /**
   * Get all flag configurations with pagination
   */
  @Get('flags')
  @ApiOperation({ summary: 'Listar flags (paginado)' })
  @ApiQuery({ name: 'page', required: true, example: '1' })
  @ApiQuery({ name: 'rows', required: true, example: '10' })
  @ApiOkResponse({ description: 'Listado paginado de flags.', schema: { type: 'object' } })
  async getAllFlagsConfigs(
    @Query('page') page: string,
    @Query('rows') rows: string,
  ) {
    return this.configService.getAllFlagsConfigs(
      parseInt(page),
      parseInt(rows),
    );
  }

  /**
   * Get all configurations with pagination
   */
  @Get()
  @ApiOperation({ summary: 'Listar configuraciones (paginado)' })
  @ApiQuery({ name: 'page', required: true, example: '1' })
  @ApiQuery({ name: 'rows', required: true, example: '10' })
  @ApiOkResponse({ description: 'Listado paginado de configuraciones.', type: ConfigsPaginatedDto })
  async getAllConfigs(
    @Query('page') page: string,
    @Query('rows') rows: string,
  ) {
    return this.configService.getAllConfigs(parseInt(page), parseInt(rows));
  }

  /**
   * Set a configuration's active status
   */
  @Patch('active')
  @ApiOperation({ summary: 'Activar/desactivar configuración' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        active: { type: 'boolean' },
        editedBy: { type: 'string' },
      },
      required: ['_id', 'active', 'editedBy'],
    },
  })
  @ApiOkResponse({ description: 'Configuración actualizada.', type: ConfigDto })
  async setActiveConfig(
    @Body('_id') id: string,
    @Body('active') active: boolean,
    @Body('editedBy') editedBy: string,
  ) {
    return this.configService.setActiveConfig(id, active, editedBy);
  }

  /**
   * Change a configuration's status
   */
  @Patch('status')
  @ApiOperation({ summary: 'Cambiar estado de configuración' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        active: { type: 'boolean' },
        editedBy: { type: 'string' },
      },
      required: ['_id', 'active', 'editedBy'],
    },
  })
  @ApiOkResponse({ description: 'Configuración actualizada.', type: ConfigDto })
  async setChangeStatusConfig(
    @Body('_id') id: string,
    @Body('active') active: boolean,
    @Body('editedBy') editedBy: string,
  ) {
    return this.configService.setChangeStatusConfig(id, active, editedBy);
  }

  /**
   * Update a configuration
   */
  @Patch()
  @ApiOperation({ summary: 'Actualizar configuración' })
  @ApiBody({ type: UpdateConfigDto })
  @ApiOkResponse({ description: 'Configuración actualizada.', type: ConfigDto })
  async updateConfig(
    @Body('_id') id: string,
    @Body() updateConfigDto: UpdateConfigDto,
  ) {
    return this.configService.updateConfig(id, updateConfigDto);
  }

  /**
   * Validate if a user is allowed in a configuration
   */
  @Post('validate-user')
  @ApiOperation({ summary: 'Validar usuario en configuración' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { configId: { type: 'string' }, userId: { type: 'string' } },
      required: ['configId', 'userId'],
    },
  })
  @ApiOkResponse({ description: 'Resultado de validación.', schema: { type: 'object' } })
  async validateUserInConfig(
    @Body('configId') configId: string,
    @Body('userId') userId: string,
  ) {
    return this.configService.validateUserInConfig(configId, userId);
  }

  /**
   * Delete a configuration
   */
  @Delete()
  @ApiOperation({ summary: 'Eliminar configuración' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  })
  @ApiOkResponse({ description: 'Configuración eliminada.', type: ConfigDto })
  async deleteConfig(@Body('id') id: string) {
    return this.configService.deleteConfig(id);
  }

  /**
   * Search configurations by term
   */
  @Get('search')
  @ApiOperation({ summary: 'Buscar configuraciones' })
  @ApiQuery({ name: 'searchTerm', required: true, example: 'feature' })
  @ApiOkResponse({ description: 'Resultados de búsqueda.', schema: { type: 'array', items: { type: 'object' } } })
  async searchConfigs(@Query('searchTerm') searchTerm: string) {
    return this.configService.searchConfigs(searchTerm);
  }
}
