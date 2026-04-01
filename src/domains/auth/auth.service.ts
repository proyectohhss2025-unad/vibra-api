import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppGateway } from 'src/infrastructure/sockets/appGateway.gateway';
import { User } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

// Interfaz para almacenar tokens invalidados
interface InvalidatedToken {
  userId: string;
  timestamp: number;
  reason?: string;
}

@Injectable()
export class AuthService {
  // Mapa para almacenar tokens invalidados por userId
  private invalidatedTokens: Map<string, InvalidatedToken> = new Map();

  // Tiempo de expiración para limpieza de tokens invalidados (24 horas en ms)
  private readonly TOKEN_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private appGateway: AppGateway,
  ) {
    // Configurar limpieza periódica de tokens invalidados
    setInterval(
      () => this.cleanupInvalidatedTokens(),
      this.TOKEN_CLEANUP_INTERVAL,
    );
  }

  async validateUser(username: string, password: string): Promise<any> {
    let user: User | null = null;
    user = await this.usersService.findByUsername(username);
    if (user) {
      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) {
        return null;
      }
    } else {
      return null;
    }

    const result = user.toObject ? user.toObject() : { ...user };
    if (result && 'password' in result) {
      delete result.password;
    }
    return result as any;
  }

  async generateToken(user: Partial<User> | any) {
    const payload = {
      documentNumber: user.documentNumber,
      name: user.name,
      username: user.username,
      sub: user._id,
      email: user.email,
      role: user.role
        ? {
            _id: user.role?._id ?? user.role,
            name: user.role?.name,
          }
        : null,
      company: user.company
        ? {
            _id: user.company?._id ?? user.company,
            name: user.company?.name,
          }
        : null,
      avatar: user.avatar,
    };

    console.log('payload:', payload);

    return {
      access_token: this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '24h',
      }),
    };
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;
    if (!username) {
      throw new UnauthorizedException('El nombre de usuario es requerido');
    }
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    await this.usersService.updateIsLogged(user._id, true);
    this.appGateway.sendActiveUsers();
    return this.generateToken(user);
  }

  async refreshToken(user: any) {
    return this.generateToken(user);
  }

  async verifyToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);

      // Verificar si el token ha sido invalidado
      if (this.isTokenInvalidated(decoded.sub)) {
        throw new UnauthorizedException('Token has been invalidated');
      }

      return decoded;
    } catch (error) {
      if (error) {
        // touch variable to satisfy linter usage
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmailAndPassword(
      email,
      password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token with user data
    const payload = {
      sub: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '24h', // Token expires in 24 hours
    });

    return {
      access_token: token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  /**
   * Invalida el token de un usuario específico
   * @param userId - ID del usuario cuyo token será invalidado
   * @param reason - Razón opcional para la invalidación
   * @returns Objeto con estado de la operación
   */
  async invalidateToken(
    userId: string,
    reason?: string,
  ): Promise<{ success: boolean }> {
    try {
      this.invalidatedTokens.set(userId, {
        userId,
        timestamp: Date.now(),
        reason,
      });

      return { success: true };
    } catch (error) {
      console.error('Error al invalidar token:', error);
      return { success: false };
    }
  }

  /**
   * Verifica si el token de un usuario ha sido invalidado
   * @param userId - ID del usuario a verificar
   * @returns true si el token está invalidado, false en caso contrario
   */
  private isTokenInvalidated(userId: string): boolean {
    return this.invalidatedTokens.has(userId);
  }

  /**
   * Limpia los tokens invalidados que han expirado
   * @private
   */
  private cleanupInvalidatedTokens(): void {
    const now = Date.now();

    for (const [userId, tokenData] of this.invalidatedTokens.entries()) {
      // Si el token ha estado invalidado por más tiempo que el intervalo de limpieza, eliminarlo
      if (now - tokenData.timestamp > this.TOKEN_CLEANUP_INTERVAL) {
        this.invalidatedTokens.delete(userId);
      }
    }
  }
}
