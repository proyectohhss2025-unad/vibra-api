import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AppGateway } from 'src/infrastructure/sockets/appGateway.gateway';
import { User } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { PermissionTemplate } from '../permissionTemplates/schemas/permissionTemplate.schema';
import { Permission } from '../permissions/schemas/permission.schema';
import { UserPermission } from '../userPermissions/schemas/userPermission.schema';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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

  // Tiempo de expiración para limpieza de tokens invalidados (24 horas en ms)
  private readonly TOKEN_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private appGateway: AppGateway,
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
      this.logger.error(`Error resolviendo permisos para usuario ${userId}:`, error);
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
