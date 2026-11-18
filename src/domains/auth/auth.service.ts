import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { AppGateway } from 'src/infrastructure/sockets/appGateway.gateway';
import { PermissionTemplate } from '../permissionTemplates/schemas/permissionTemplate.schema';
import { Permission } from '../permissions/schemas/permission.schema';
import { UserPermission } from '../userPermissions/schemas/userPermission.schema';
import { User } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginProtectionService } from './login-protection.service';

// Interfaz para almacenar tokens invalidados
interface InvalidatedToken {
  userId: string;
  timestamp: number;
  reason?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Mapa para almacenar tokens invalidados por userId
  private invalidatedTokens: Map<string, InvalidatedToken> = new Map();

  // Hash de relleno: iguala el tiempo de respuesta cuando el usuario no existe
  // y evita enumeración de cuentas por diferencias de latencia.
  private readonly dummyPasswordHash = bcrypt.hashSync(
    'vibra-login-dummy-password',
    10,
  );

  // Tiempo de expiración para limpieza de tokens invalidados (24 horas en ms)
  private readonly TOKEN_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private appGateway: AppGateway,
    private readonly loginProtection: LoginProtectionService,
    @InjectModel(PermissionTemplate.name)
    private permissionTemplateModel: Model<PermissionTemplate>,
    @InjectModel(Permission.name)
    private permissionModel: Model<Permission>,
    @InjectModel(UserPermission.name)
    private userPermissionModel: Model<UserPermission>,
  ) {
    // Configurar limpieza periódica de tokens invalidados
    setInterval(
      () => this.cleanupInvalidatedTokens(),
      this.TOKEN_CLEANUP_INTERVAL,
    );
  }

  async validateUser(username: string, password: string): Promise<any> {
    let user: any = null;

    try {
      user = await this.usersService.findByUsername(username);
    } catch (error) {
      // findByUsername lanza 404 cuando no existe. Se normaliza a null para no
      // revelar la existencia de la cuenta (enumeración de usuarios).
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

    if (!user) {
      // Comparación de relleno: mantiene un tiempo de respuesta similar al de
      // una contraseña incorrecta.
      bcrypt.compareSync(password, this.dummyPasswordHash);
      return null;
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // Bloquear usuarios inactivos (ej: auto-registro desde la app mobile que aún
    // no ha sido aprobado por un docente o administrador).
    if (user.isActive === false) {
      throw new UnauthorizedException(
        'Tu cuenta está pendiente de aprobación. Un docente o administrador debe activarla antes de que puedas ingresar.',
      );
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

    return {
      access_token: this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '24h',
      }),
    };
  }

  async login(loginDto: LoginDto, ip?: string) {
    const username = (loginDto.username ?? '').trim();
    const { password } = loginDto;

    if (!username) {
      throw new UnauthorizedException('El nombre de usuario es requerido');
    }
    if (!password) {
      throw new UnauthorizedException('La contraseña es requerida');
    }

    const ipStatus = this.loginProtection.getIpStatus(ip);
    if (ipStatus.blocked) {
      const user = await this.validateUser(username, password);
      if (!user) {
        throw this.buildLoginRateLimitedException(ipStatus.retryAfterSeconds);
      }
      await this.loginProtection.reset(username);
      return this.completeLogin(user);
    }

    const lockStatus = await this.loginProtection.getLockStatus(username);

    if (lockStatus.locked) {
      const user = await this.validateUser(username, password);
      if (!user) {
        throw this.buildLoginLockedException(lockStatus.retryAfterSeconds);
      }
      await this.loginProtection.reset(username);
      return this.completeLogin(user);
    }

    const user = await this.validateUser(username, password);

    if (!user) {
      const failure = await this.loginProtection.registerFailure(username, ip);
      if (failure.locked) {
        throw this.buildLoginLockedException(failure.retryAfterSeconds);
      }
      // Mismo mensaje para usuario inexistente y contraseña incorrecta.
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    await this.loginProtection.reset(username);
    return this.completeLogin(user);
  }

  private async completeLogin(user: any) {
    await this.usersService.updateIsLogged(user._id, true);
    this.appGateway.sendActiveUsers();
    return this.generateToken(user);
  }

  /**
   * 429 por exceso de fallos desde una misma red. Las credenciales correctas
   * siguen funcionando, así que no bloquea a una institución tras un NAT.
   */
  private buildLoginRateLimitedException(
    retryAfterSeconds: number,
  ): HttpException {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    return new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'LOGIN_RATE_LIMITED',
        message: `Demasiados intentos de inicio de sesión desde esta red. Espera ${minutes} minuto(s) antes de volver a intentar.`,
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * 429 con código estable y tiempo de espera para que el cliente muestre un
   * mensaje accionable ("espera N minutos").
   */
  private buildLoginLockedException(retryAfterSeconds: number): HttpException {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    return new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'LOGIN_LOCKED',
        message: `Demasiados intentos fallidos. Por seguridad, espera ${minutes} minuto(s) antes de volver a intentar.`,
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  async refreshToken(user: any) {
    return this.generateToken(user);
  }

  async verifyToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);

      // Verificar si el token ha sido invalidado
      if (this.isTokenInvalidated(decoded.sub)) {
        throw new UnauthorizedException(
          'La sesión fue cerrada. Inicia sesión de nuevo.',
        );
      }

      return decoded;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token inválido o expirado.');
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
   * Resuelve los permisos completos de un usuario.
   *
   * Flujo:
   * 1. Obtiene el rol del usuario (si tiene)
   * 2. Del rol, obtiene la plantilla de permisos y sus permisos asociados
   * 3. También consulta asignaciones directas (UserPermission)
   * 4. Une y deduplica ambas listas
   *
   * @param userId - ID del usuario
   * @returns Permisos resueltos con metadatos
   */
  async resolvePermissions(userId: string) {
    const permissionMap = new Map<string, any>();
    let isSuperAdmin = false;
    let roleInfo: { _id: string; name: string } | null = null;

    try {
      const userIdObj = new Types.ObjectId(userId);

      // 1. Obtener usuario con rol populado
      const user = await this.usersService.findByOne({ _id: userIdObj });

      if (user?.role) {
        const role = user.role as any;
        const roleId = role._id || role;
        roleInfo = { _id: String(roleId), name: role.name || '' };

        // Verificar isSuperAdmin directamente del rol populado
        isSuperAdmin = role.isSuperAdmin === true;

        // Si el rol tiene plantilla populada, extraer permisos
        if (role.permissionTemplate) {
          const template = role.permissionTemplate as any;
          if (template.permissions && Array.isArray(template.permissions)) {
            for (const perm of template.permissions) {
              if (perm && perm.serial) {
                permissionMap.set(perm.serial, {
                  _id: perm._id,
                  name: perm.name,
                  serial: perm.serial,
                  description: perm.description,
                });
              }
            }
          }
        }
      }

      // 2. Resolver permisos directos (UserPermission)
      const directPermissions = await this.userPermissionModel
        .find({
          user: new Types.ObjectId(userId),
          deleted: { $ne: true },
          isActive: { $ne: false },
        })
        .populate('permission')
        .exec();

      for (const up of directPermissions) {
        const perm = up.permission as any;
        if (perm && perm.serial) {
          permissionMap.set(perm.serial, {
            _id: perm._id,
            name: perm.name,
            serial: perm.serial,
            description: perm.description,
          });
        }
      }

      // 3. Si es SuperAdmin, devolver TODOS los permisos del sistema
      if (isSuperAdmin) {
        const allPermissions = await this.permissionModel
          .find({ deleted: { $ne: true }, isActive: { $ne: false } })
          .exec();

        for (const perm of allPermissions) {
          permissionMap.set(perm.serial, {
            _id: perm._id,
            name: perm.name,
            serial: perm.serial,
            description: perm.description,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Error resolviendo permisos para usuario ${userId}:`,
        error,
      );
      // Devolver estructura vacía pero válida
      return {
        isSuperAdmin: false,
        role: null,
        permissions: [],
        serials: [],
      };
    }

    const permissionsArray = Array.from(permissionMap.values());
    const serials = permissionsArray.map((p) => p.serial);

    return {
      isSuperAdmin,
      role: roleInfo,
      permissions: permissionsArray,
      serials,
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

  /**
   * Cambia la contraseña de un usuario autenticado.
   * Verifica la contraseña actual y guarda la nueva con hash bcrypt.
   *
   * @param userId - ID del usuario (extraído del JWT)
   * @param currentPassword - Contraseña actual para verificar
   * @param newPassword - Nueva contraseña a guardar
   * @returns { success: true } si todook
   * @throws UnauthorizedException si la contraseña actual es incorrecta
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Verificar contraseña actual
    const isPasswordValid = bcrypt.compareSync(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    // Verificar que la nueva no sea igual a la actual
    const isSamePassword = bcrypt.compareSync(newPassword, user.password);
    if (isSamePassword) {
      throw new UnauthorizedException(
        'La nueva contraseña no puede ser igual a la actual',
      );
    }

    // Hashear y guardar nueva contraseña
    const saltRounds = 10;
    const hashedPassword = bcrypt.hashSync(newPassword, saltRounds);
    await this.usersService.updatePassword(userId, hashedPassword);

    return { success: true };
  }
}
