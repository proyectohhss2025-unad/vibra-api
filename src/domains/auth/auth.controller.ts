import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { Public } from 'src/infrastructure/auth/public.decorator';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('api/auth')
@ApiTags('Gestión de autenticación de usuarios')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
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
      const user = await this.usersService.create({
        ...registerDto,
        avatar: registerDto.avatar || 'default-avatar.png',
      });
      return { message: 'User registered successfully' };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Registration failed');
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
  @ApiOkResponse({ description: 'Perfil del usuario.', schema: { type: 'object' } })
  async getProfile(@Request() req: any) {
    return req.user;
  }

  @Public()
  @Post('refresh-token')
  @ApiOperation({ summary: 'Refrescar token' })
  @ApiOkResponse({ description: 'Token refrescado.', schema: { type: 'object' } })
  async refreshToken(@Request() req: any) {
    return this.authService.refreshToken(req.user);
  }

  @Post('verify-token')
  @ApiOperation({ summary: 'Verificar token' })
  @ApiBody({ schema: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] } })
  @ApiOkResponse({ description: 'Resultado de verificación.', schema: { type: 'object' } })
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
}
