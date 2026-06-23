import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
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
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto } from './dto/create-contact.dto';
import { Contact } from './schemas/contact.schema';

class ContactDto {
  @ApiProperty({ example: '66c9cce47e6a95e98116c0ab' })
  _id: string;

  @ApiProperty({ example: 'María García' })
  name: string;

  @ApiProperty({ example: 'maria@colegio.edu' })
  email: string;

  @ApiProperty({ example: 'Quiero implementar Vibra' })
  subject: string;

  @ApiProperty({ example: 'Hola, estamos interesados...' })
  message: string;

  @ApiProperty({
    enum: ['unread', 'read', 'in_progress', 'resolved', 'spam'],
    example: 'unread',
  })
  status: string;

  @ApiPropertyOptional({ example: 'Contactar al 3001234567' })
  notes?: string;

  @ApiPropertyOptional({ example: null })
  readAt: Date | null;

  @ApiPropertyOptional({ example: null })
  resolvedAt: Date | null;

  @ApiProperty({ example: '2026-05-24T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-24T10:30:00.000Z' })
  updatedAt: Date;
}

class ContactPaginatedDto {
  @ApiProperty({ type: [ContactDto] })
  data: ContactDto[];

  @ApiProperty({ example: 27 })
  total: number;
}

class ContactStatsDto {
  @ApiProperty({ example: 45 })
  total: number;

  @ApiProperty({ example: 12 })
  unread: number;

  @ApiProperty({ example: 5 })
  in_progress: number;

  @ApiProperty({ example: 25 })
  resolved: number;

  @ApiProperty({ example: 3 })
  spam: number;
}

@ApiTags('Contacts')
@Controller('api/contact')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un mensaje de contacto (público)',
    description:
      'Endpoint público para el formulario de contacto de la landing page. No requiere autenticación.',
  })
  @ApiBody({ type: CreateContactDto })
  @ApiCreatedResponse({
    description: 'Mensaje de contacto creado.',
    type: ContactDto,
  })
  async create(@Body() createContactDto: CreateContactDto): Promise<Contact> {
    return this.contactsService.create(createContactDto);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Buscar mensajes de contacto por término (admin)' })
  @ApiQuery({ name: 'searchTerm', required: true, example: 'maria' })
  @ApiOkResponse({ description: 'Resultados de búsqueda.', type: [ContactDto] })
  async search(
    @Query('searchTerm') searchTerm: string,
  ): Promise<{ data: Contact[] }> {
    const data = await this.contactsService.search(searchTerm);
    return { data };
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar todos los mensajes de contacto (admin)' })
  @ApiOkResponse({
    description: 'Lista de mensajes de contacto.',
    type: [ContactDto],
  })
  async findAll(): Promise<Contact[]> {
    return this.contactsService.findAll();
  }

  @Get('allPaginate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar mensajes de contacto paginados (admin)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    example: 'unread',
    description: 'Filtrar por estado',
  })
  @ApiOkResponse({
    description: 'Lista paginada de mensajes.',
    type: ContactPaginatedDto,
  })
  async findAllPaginate(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ): Promise<{ data: Contact[]; total: number }> {
    return this.contactsService.findAllPaginate(page, limit, status);
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener un mensaje de contacto por ID (admin)' })
  @ApiParam({
    name: 'id',
    description: 'ID del mensaje (MongoDB _id).',
    example: '66c9cce47e6a95e98116c0ab',
  })
  @ApiOkResponse({ description: 'Mensaje encontrado.', type: ContactDto })
  @ApiNotFoundResponse({ description: 'Mensaje no encontrado.' })
  async findById(@Param('id') id: string): Promise<Contact> {
    const contact = await this.contactsService.findById(id);
    if (!contact) {
      throw new NotFoundException(
        `Mensaje de contacto con id ${id} no encontrado`,
      );
    }
    return contact;
  }

  @Post('update')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Actualizar estado/notas de un mensaje de contacto (admin)',
  })
  @ApiBody({ type: UpdateContactDto })
  @ApiOkResponse({ description: 'Mensaje actualizado.', type: ContactDto })
  async update(@Body() updateContactDto: UpdateContactDto): Promise<Contact> {
    return this.contactsService.update(updateContactDto);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obtener estadísticas de mensajes de contacto (admin)',
  })
  @ApiOkResponse({ description: 'Conteos por estado.', type: ContactStatsDto })
  async getStats(): Promise<{
    total: number;
    unread: number;
    in_progress: number;
    resolved: number;
    spam: number;
  }> {
    return this.contactsService.getStats();
  }
}
