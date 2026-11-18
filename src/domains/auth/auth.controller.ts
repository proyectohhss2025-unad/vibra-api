import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  InternalServerErrorException,
  Logger,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import mongoose from 'mongoose';
import { Public } from 'src/infrastructure/auth/public.decorator';
import { RequirePermission } from 'src/infrastructure/auth/require-permission.decorator';
import { CAPTCHA_FLOW_REGISTER } from 'src/infrastructure/captcha/captcha.constants';
import { CaptchaService } from 'src/infrastructure/captcha/captcha.service';
import { getClientIp } from 'src/infrastructure/captcha/request-ip.util';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { PublicRegisterDto } from './dto/public-register.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('api/auth')
@ApiTags('Gestión de autenticación de usuarios')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly captchaService: CaptchaService,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  @Public()
  @Post('health')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Verificar salud del servicio de autenticación y de la base de datos',
  })
  @ApiOkResponse({
    description:
      'Estado del API y de la conexión a MongoDB. Siempre responde 200: el cliente debe ' +
      'inspeccionar `status` y `mongo.ok` para distinguir “API caído” de “API en línea sin base de datos”.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'Ok' },
        uptimeSeconds: { type: 'number', example: 3600 },
        mongo: {
          type: 'object',
          properties: {
            ok: { type: 'boolean', example: true },
            readyState: { type: 'number', example: 1 },
            readyStateLabel: { type: 'string', example: 'connected' },
            latencyMs: { type: 'number', example: 3 },
            error: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  async health() {
    const mongo = await this.checkMongo();
    return {
      // "Degraded" en lugar de lanzar 5xx: el SPA necesita leer el cuerpo para
      // mostrar un mensaje distinto al de “El API no se encuentra en línea”.
      status: mongo.ok ? 'Ok' : 'Degraded',
      uptimeSeconds: Math.round(process.uptime()),
      mongo,
    };
  }

  /**
   * Estado real de la conexión a MongoDB.
   *
   * Se consulta `readyState` antes del `ping` para no quedarse esperando el
   * buffer de Mongoose (10 s) cuando la conexión está caída.
   */
  private async checkMongo(): Promise<{
    ok: boolean;
    readyState: number;
    readyStateLabel: string;
    latencyMs: number;
    error?: string;
  }> {
    const labels = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const readyState = this.connection?.readyState ?? 0;
    const readyStateLabel = labels[readyState] ?? 'unknown';
    const startedAt = Date.now();

    if (readyState !== 1 || !this.connection.db) {
      return {
        ok: false,
        readyState,
        readyStateLabel,
        latencyMs: 0,
        error: `Conexión no disponible (${readyStateLabel})`,
      };
    }

    try {
      await this.connection.db.admin().ping();
      return {
        ok: true,
        readyState,
        readyStateLabel,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error: any) {
      return {
        ok: false,
        readyState,
        readyStateLabel,
        latencyMs: Date.now() - startedAt,
        error: error?.message ?? 'ping falló',
      };
    }
  }

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Registrar usuario (requiere captcha)',
    description:
      'Registro público desde la app móvil. Exige un reto de captcha vigente ' +
      '(GET /api/captcha/challenge), aplica límite de peticiones por IP y ' +
      'crea la cuenta inactiva a la espera de aprobación.',
  })
  @ApiBody({ type: PublicRegisterDto })
  @ApiResponse({ status: 201, description: 'Usuario registrado.' })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos o captcha inválido/expirado (campo `code` con el motivo).',
  })
  @ApiResponse({
    status: 409,
    description: 'Usuario, documento o email ya registrado.',
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas solicitudes. Espera un momento.',
  })
  async register(
    @Body() registerDto: PublicRegisterDto,
    @Request() request: any,
  ) {
    const ip = getClientIp(request);

    // Honeypot: una persona nunca ve este campo; un bot que rellena todo sí.
    if (registerDto.website?.trim()) {
      this.logger.warn(`[auth/register] Honeypot activado desde ${ip}`);
      throw new BadRequestException(
        'No pudimos procesar el registro. Intenta de nuevo.',
      );
    }

    // Verificación anti-bot antes de tocar la base de datos.
    await this.captchaService.verifyOrThrow({
      challengeId: registerDto.captchaId,
      answer: registerDto.captchaAnswer,
      ip,
      flow: CAPTCHA_FLOW_REGISTER,
    });

    try {
      // Asignar rol "Estudiante" automáticamente
      const estudianteRole = await this.rolesService.findByName('Estudiante');

      // Registro público: el usuario se crea INACTIVO (isPublic: true) y debe ser
      // activado por un docente o administrador antes de poder iniciar sesión.
      // Solo se aceptan campos del formulario: nunca se hace spread del body
      // completo (evita mass assignment de isActive, role, totalScore, etc.).
      await this.usersService.create(
        {
          ...this.buildRegistrationPayload(registerDto),
          role: estudianteRole._id.toString(),
        },
        { isPublic: true },
      );
      return {
        message:
          'Usuario registrado exitosamente. Tu cuenta está pendiente de aprobación por un docente o administrador.',
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Role not found') {
        throw new InternalServerErrorException(
          'Rol Estudiante no configurado en el sistema. Contacta al administrador.',
        );
      }
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `[auth/register] Fallo inesperado: ${(error as any)?.message ?? error}`,
      );
      throw new InternalServerErrorException(
        'No pudimos completar el registro. Intenta de nuevo en unos minutos.',
      );
    }
  }

  @RequirePermission('P-ADM-001')
  @Post('register-docente')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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

      await this.usersService.create({
        ...this.buildRegistrationPayload(registerDto),
        role: docenteRole._id.toString(),
      });
      return { message: 'Docente registrado exitosamente' };
    } catch (error) {
      if (error instanceof Error && error.message === 'Role not found') {
        throw new InternalServerErrorException(
          'Rol Docente no configurado. Ejecute el seed seed-docente-rol.ts primero.',
        );
      }
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `[auth/register-docente] Fallo inesperado: ${(error as any)?.message ?? error}`,
      );
      throw new InternalServerErrorException(
        'No pudimos registrar al docente. Intenta de nuevo en unos minutos.',
      );
    }
  }

  /**
   * Construye el payload de creación con una lista blanca de campos.
   * Evita que el registro público acepte propiedades arbitrarias del cliente.
   */
  private buildRegistrationPayload(registerDto: RegisterDto) {
    return {
      name: registerDto.name?.trim(),
      username: registerDto.username?.trim(),
      email: registerDto.email?.trim().toLowerCase(),
      password: registerDto.password,
      documentNumber: registerDto.documentNumber?.trim(),
      documentType: registerDto.documentType ?? registerDto.typeDocument,
      company: registerDto.company,
      avatar: registerDto.avatar || 'default-avatar.svg',
    };
  }

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Límite de 10 intentos por minuto por combinación IP + usuario. ' +
      'Tras varios fallos consecutivos la cuenta se bloquea temporalmente (429, code LOGIN_LOCKED).',
  })
  @ApiResponse({ status: 200, description: 'Inicio de sesión exitoso' })
  @ApiResponse({
    status: 401,
    description: 'Usuario o contraseña incorrectos.',
  })
  @ApiResponse({
    status: 429,
    description:
      'Demasiados intentos (rate limit o bloqueo temporal de la cuenta).',
  })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto, @Request() request: any) {
    return this.authService.login(loginDto, getClientIp(request));
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
