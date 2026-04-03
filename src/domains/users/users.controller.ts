import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
import { JwtService } from '@nestjs/jwt';
import { EventsGateway } from '../../infrastructure/sockets/events.gateway';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';

class UserCreateResponseDto {
  @ApiProperty({
    description: 'Nombre de usuario del usuario creado.',
    example: 'maya',
  })
  username: string;
}

class RoleSummaryDto {
  @ApiProperty({
    description: 'Identificador del rol.',
    example: '66c9cce47e6a95e98116c0ab',
  })
  _id: string;

  @ApiProperty({
    description: 'Nombre del rol.',
    example: 'Administrador',
  })
  name: string;
}

class CompanySummaryDto {
  @ApiProperty({
    description: 'Identificador de la compañía/institución.',
    example: '66c9cce47e6a95e98116c0ac',
  })
  _id: string;

  @ApiProperty({
    description: 'Nombre de la compañía/institución.',
    example: 'Institución Demo',
  })
  name: string;
}

class UserDto {
  @ApiProperty({
    description: 'Identificador del usuario.',
    example: '69c4b4fc528c5e1f4ab79d0c',
  })
  _id: string;

  @ApiPropertyOptional({
    description: 'Nombre completo del usuario.',
    example: 'Maya',
  })
  name?: string;

  @ApiProperty({
    description: 'Nombre de usuario único.',
    example: 'maya',
  })
  username: string;

  @ApiPropertyOptional({
    description: 'Número de documento del usuario.',
    example: '6803296',
  })
  documentNumber?: string;

  @ApiPropertyOptional({
    description: 'Tipo de documento del usuario.',
    example: 'CC',
  })
  documentType?: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico del usuario.',
    example: 'maya@vibra.local',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Indica si mantiene sesión activa.',
    example: true,
  })
  keepSessionActive?: boolean;

  @ApiPropertyOptional({
    description: 'Rol asociado (cuando está poblado).',
    type: RoleSummaryDto,
  })
  role?: RoleSummaryDto | string;

  @ApiPropertyOptional({
    description: 'Compañía asociada (cuando está poblada).',
    type: CompanySummaryDto,
  })
  company?: CompanySummaryDto | string;

  @ApiPropertyOptional({
    description: 'Avatar del usuario.',
    example: 'default-user.png',
  })
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Género del usuario.',
    example: 'MALE',
  })
  gender?: string;

  @ApiPropertyOptional({
    description: 'Fecha de nacimiento (ISO string).',
    example: '2000-01-01T00:00:00.000Z',
  })
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'Estado de conexión en tiempo real.',
    example: false,
  })
  isLogged?: boolean;

  @ApiPropertyOptional({
    description: 'Puntaje acumulado del usuario.',
    example: 0,
  })
  totalScore?: number;

  @ApiPropertyOptional({
    description: 'Serial interno del usuario.',
    example: 'USR-0001',
  })
  serial?: string;
}

class UsersPaginatedDto {
  @ApiProperty({
    description: 'Listado de usuarios.',
    type: [UserDto],
  })
  data: UserDto[];

  @ApiProperty({
    description: 'Total de registros.',
    example: 120,
  })
  total: number;
}

@ApiTags('Users')
@Controller('api/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventsGateway: EventsGateway,
    private readonly jwtService: JwtService,
  ) { }

  @Get('trigger')
  @ApiOperation({
    summary: 'Emitir un evento de prueba por WebSocket',
    description:
      'Emite un evento de ejemplo para validar la comunicación en tiempo real desde el backend hacia el dashboard.',
  })
  @ApiOkResponse({
    description: 'Evento emitido correctamente.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Evento emitido' },
      },
    },
  })
  triggerEvent() {
    const data = { message: '¡Evento generado desde el backend!' };
    this.eventsGateway.emitEvent(data);
    return { message: 'Evento emitido' };
  }

  @Post('create')
  @ApiOperation({
    summary: 'Crear un usuario',
    description:
      'Crea un nuevo usuario para el dashboard de administración de participación estudiantil (Vibra). La contraseña se almacena con hash.',
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'Datos requeridos para crear un usuario.',
  })
  @ApiCreatedResponse({
    description:
      'Usuario creado correctamente. Retorna el username del usuario creado.',
    type: UserCreateResponseDto,
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto).then((response: User) => {
      if (response) {
        const data = {
          message: `Se ha registrado un nuevo usuario al sistema, Usuario: ${response.username}`,
        };
        this.eventsGateway.emitEvent(data);
        return { username: response.username };
      } else {
        return null;
      }
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Actualizar un usuario',
    description:
      'Actualiza los datos de un usuario por su _id. La contraseña se rehace con hash si se envía en el payload.',
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'Datos para actualizar un usuario.',
  })
  @ApiOkResponse({
    description: 'Usuario actualizado correctamente.',
    type: UserDto,
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto de unicidad (por ejemplo, email duplicado) al actualizar el usuario.',
  })
  async update(@Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(updateUserDto);
  }

  @Get('all')
  @ApiOperation({
    summary: 'Listar usuarios',
    description:
      'Obtiene el listado completo de usuarios registrados. Incluye el rol asociado.',
  })
  @ApiOkResponse({
    description: 'Listado de usuarios.',
    type: [UserDto],
  })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('count-all-users')
  @ApiOperation({
    summary: 'Obtener el número total de usuarios',
    description:
      'Obtiene el número total de usuarios registrados.',
  })
  @ApiOkResponse({
    description: 'Número total de usuarios obtenido exitosamente.',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 120 },
      },
    },
  })
  findCountAll(@Query() query: any) {
    return this.usersService.getCountAll(query);
  }

  @Get('allPaginate')
  @ApiOperation({
    summary: 'Listar usuarios con paginación (respuesta encapsulada)',
    description:
      'Obtiene usuarios y el total de registros. El backend retorna { data, total }.',
  })
  @ApiOkResponse({
    description: 'Listado paginado de usuarios.',
    type: UsersPaginatedDto,
  })
  async findAllWithPaginate() {
    return this.usersService.findAllWithPaginate();
  }

  @Get('search/:username')
  @ApiOperation({
    summary: 'Consultar un usuario por username',
    description:
      'Busca un usuario por su username. Incluye rol y compañía si están asociados.',
  })
  @ApiParam({
    name: 'username',
    description: 'Nombre de usuario a buscar.',
    example: 'maya',
  })
  @ApiOkResponse({
    description: 'Usuario encontrado.',
    type: UserDto,
  })
  @ApiNotFoundResponse({
    description: 'Usuario no encontrado.',
  })
  async findOne(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }

  @Get('id/:id')
  @ApiOperation({ summary: 'Obtener usuario por id' })
  @ApiParam({ name: 'id', description: 'ID del usuario.' })
  @ApiOkResponse({ description: 'Usuario encontrado.', type: UserDto })
  async findOneById(@Param('id') id: string) {
    return this.usersService.findByOne({ _id: id });
  }
}
