import { Body, Controller, Get, Post, Request, UnauthorizedException } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
    ) { }

    @Public()
    @Post('health')
    async health() {
        return { status: 'Ok' };
    }

    @Public()
    @Post('register')
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
    async getProfile(@Request() req: any) {
        return req.user;
    }

    @Public()   
    @Post('refresh-token')
    async refreshToken(@Request() req: any) {
        return this.authService.refreshToken(req.user);
    }

    @Post('verify-token')
    async verifyToken(@Body() body: { token: string }) {
        return this.authService.verifyToken(body.token);
    }

    @Public()
    @Post('validate')
    async findByEmailAndPassword(@Body('email') email: string, @Body('password') password: string) {
        console.info('User email and password: ', email, password);
        return this.authService.validate(email, password);
    }

    @Public()
    @Post('logout')
    async logout(@Request() req: any, @Body() body: { userId: string }) {
        // Actualizar el estado isLogged del usuario a false
        /* await this.usersService.updateIsLogged({
            _id: body.userId,
            isLogged: true // Se invertirá a false en el método updateIsLogged
        } as unknown as User); */
        
         await this.usersService.updateIsLogged(
            body.userId,
            false
        );

        // Invalidar el token
        await this.authService.invalidateToken(body.userId);

        // Limpiar datos de sesión si existen
        if (req.session) {
            req.session.destroy();
        }

        return { message: 'Logged out successfully', logout: true, isLogged: false };
    }
}