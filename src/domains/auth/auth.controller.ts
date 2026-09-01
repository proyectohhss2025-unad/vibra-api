import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/infrastructure/auth/public.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RolesService } from '../roles/roles.service';

@Controller('api/auth')
@ApiTags('Gestión de autenticación de usuarios')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  @Public()
  @Post('health')
  @ApiOperation({ summary: 'Verificar salud del servicio de autenticación' })
  @ApiOkResponse({ description: 'Estado OK.', schema: { type: 'object' } })
  async health() {
    return { status: 'Ok' };
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar usuario' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Usuario registrado.' })
  async register(@Body() registerDto: RegisterDto) {
    try {
      // Asignar rol "Estudiante" automáticamente
      const estudianteRole = await this.rolesService.findByName('Estudiante');

      // Registro público: el usuario se crea INACTIVO (isPublic: true) y debe ser
      // activado por un docente o administrador antes de poder iniciar sesión.
      const user = await this.usersService.create(
        {
          ...registerDto,
          role: estudianteRole._id.toString(),
          avatar: registerDto.avatar || 'default-avatar.svg',
        },
        { isPublic: true },
      );
      return {
        message:
          'Usuario registrado exitosamente. Tu cuenta está pendiente de aprobación por un docente o administrador.',
      };
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message === 'Role not found') {
        throw new UnauthorizedException(
          'Rol Estudiante no configurado. Contacte al administrador.',
        );
      }
      throw new UnauthorizedException('Registration failed');
    }
  }

  @RequirePermission('9')
  @Post('register-docente')
  @ApiOperation({ summary: 'Registrar docente (solo admin)' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Docente registrado.' })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado (requiere permiso 9).',
  })
  async registerDocente(@Body() registerDto: RegisterDto) {
    try {
      const docenteRole = await this.rolesService.findByName('Docente');

      const user = await this.usersService.create({
        ...registerDto,
        role: docenteRole._id.toString(),
        avatar: registerDto.avatar || 'default-avatar.svg',
      });
      return { message: 'Docente registrado exitosamente' };
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message === 'Role not found') {
        throw new UnauthorizedException(
          'Rol Docente no configurado. Ejecute el seed seed-docente-rol.ts primero.',
        );
      }
      throw new UnauthorizedException('Docente registration failed');
    }
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Inicio de sesión exitoso' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Obtener perfil de usuario autenticado' })
  @ApiOkResponse({
    description: 'Perfil del usuario.',
    schema: { type: 'object' },
  })
  async getProfile(@Request() req: any) {
    return req.user;
  }

  @Get('my-permissions')
  @ApiOperation({ summary: 'Obtener permisos del usuario autenticado' })
  @ApiOkResponse({
    description: 'Permisos resueltos del usuario.',
    schema: {
      type: 'object',
      properties: {
        isSuperAdmin: { type: 'boolean' },
        role: {
          type: 'object',
          properties: { _id: { type: 'string' }, name: { type: 'string' } },
          nullable: true,
        },
        permissions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              serial: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
        serials: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async getMyPermissions(@Request() req: any) {
    const userId = req.user?._id || req.user?.sub;
    return this.authService.resolvePermissions(userId);
  }

  @Get('check-access')
  @ApiOperation({
    summary: 'Verificar si el usuario autenticado tiene un permiso específico',
    description:
      'Útil para que el frontend muestre/oculte secciones de UI sin llamar a endpoints que devolverían 403. ' +
      'Ej: /api/auth/check-access?serial=P-EST-001',
  })
  @ApiQuery({
    name: 'serial',
    required: true,
    description: 'Serial del permiso a verificar (ej: P-EST-001)',
    example: 'P-EST-001',
  })
  @ApiOkResponse({
    description: 'Resultado de la verificación.',
    schema: {
      type: 'object',
      properties: {
        hasAccess: { type: 'boolean', example: true },
        serial: { type: 'string', example: 'P-EST-001' },
      },
    },
  })
  async checkAccess(
    @Request() req: any,
    @Query('serial') serial: string,
  ): Promise<{ hasAccess: boolean; serial: string }> {
    if (!serial) {
      return { hasAccess: false, serial: '' };
    }
    const userId = req.user?._id || req.user?.sub;
    if (!userId) {
      return { hasAccess: false, serial };
    }
    const permissions = await this.authService.resolvePermissions(userId);
    const hasAccess =
      permissions.isSuperAdmin || permissions.serials.includes(serial);
    return { hasAccess, serial };
  }

  @Public()
  @Post('refresh-token')
  @ApiOperation({ summary: 'Refrescar token' })
  @ApiOkResponse({
    description: 'Token refrescado.',
    schema: { type: 'object' },
  })
  async refreshToken(@Request() req: any) {
    return this.authService.refreshToken(req.user);
  }

  @Post('verify-token')
  @ApiOperation({ summary: 'Verificar token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { token: { type: 'string' } },
      required: ['token'],
    },
  })
  @ApiOkResponse({
    description: 'Resultado de verificación.',
    schema: { type: 'object' },
  })
  async verifyToken(@Body() body: { token: string }) {
    return this.authService.verifyToken(body.token);
  }

  @Public()
  // Endpoint de validación por email removido: ahora el login solo usa username + password
  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { userId: { type: 'string' } },
      required: ['userId'],
    },
  })
  @ApiOkResponse({ description: 'Sesión cerrada.', schema: { type: 'object' } })
  async logout(@Request() req: any, @Body() body: { userId: string }) {
    // Actualizar el estado isLogged del usuario a false
    /* await this.usersService.updateIsLogged({
            _id: body.userId,
            isLogged: true // Se invertirá a false en el método updateIsLogged
        } as unknown as User); */

    await this.usersService.updateIsLogged(body.userId, false);

    // Invalidar el token
    await this.authService.invalidateToken(body.userId);

    // Limpiar datos de sesión si existen
    if (req.session) {
      req.session.destroy();
    }

    return {
      message: 'Logged out successfully',
      logout: true,
      isLogged: false,
    };
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Cambiar contraseña del usuario autenticado' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({
    description: 'Contraseña actualizada exitosamente.',
    schema: {
      type: 'object',
      properties: { success: { type: 'boolean' } },
    },
  })
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const userId = req.user?._id || req.user?.sub;
    return this.authService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }
}
