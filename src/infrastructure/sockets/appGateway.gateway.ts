import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Interval } from '@nestjs/schedule';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RankingService } from 'src/domains/rankings/ranking.service';

/** Datos completos de un usuario conectado al socket */
export interface ConnectedUser {
  socketId: string;
  userId: string;
  username: string;
  name: string;
  email: string;
  avatar: string;
  role: { _id: string; name: string } | null;
  platform: 'web' | 'mobile';
  connectedAt: Date;
}

/**
 * Sin latido durante este tiempo el usuario deja de mostrarse como conectado.
 *
 * El latido lo emite engine.io en cada ping/pong (cada ~25 s por defecto), así
 * que el umbral tolera varios latidos perdidos (red inestable, event loop
 * ocupado) sin dar de baja a alguien que sí está conectado.
 */
const STALE_AFTER_MS = 120_000;

/** Frecuencia del barrido que recalcula la lista visible de conectados. */
const SWEEP_INTERVAL_MS = 30_000;

/**
 * Gateway de presencia en el namespace raíz.
 *
 * Requiere `ScheduleModule.forRoot()`, provisto globalmente por `SchedulingModule`.
 */
@WebSocketGateway({ cors: true })
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  // Mapa para almacenar los usuarios conectados (key = socketId)
  private connectedUsers: Map<string, ConnectedUser> = new Map();

  // Último heartbeat por socket (epoch ms)
  private lastSeenAt: Map<string, number> = new Map();

  // Firma de la última lista emitida: evita difundir sin cambios
  private lastSignature = '';

  constructor(
    private readonly rankingService: RankingService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    // No se requiere inicialización adicional
  }

  /**
   * Se llama cuando un socket se conecta al gateway.
   * Si el handshake trae un JWT válido, la sesión se registra de inmediato con
   * los datos del token (fuente de verdad del servidor). Si no, se agrega una
   * entrada temporal hasta que el cliente se identifique.
   * @param client La instancia del socket conectado.
   */
  async handleConnection(client: Socket) {
    // Latido del transporte (engine.io): se emite en cada ping/pong, así que
    // confirma que el cliente sigue vivo sin requerir código extra en el cliente.
    client.conn?.on('heartbeat', () => this.touch(client.id));

    const authenticated = this.authenticateClient(client);

    if (authenticated) {
      this.connectedUsers.set(client.id, authenticated);
      this.touch(client.id);
      this.logger.log(
        `Sesión validada en socket: ${authenticated.name} (${authenticated.platform}) socket=${client.id}`,
      );
    } else {
      // Registrar entrada temporal hasta que el cliente se identifique
      const tempUser: ConnectedUser = {
        socketId: client.id,
        userId: '',
        username: '',
        name: 'Conectando...',
        email: '',
        avatar: 'default-avatar.svg',
        role: null,
        platform: 'web',
        connectedAt: new Date(),
      };
      this.connectedUsers.set(client.id, tempUser);
      this.touch(client.id);
      this.logger.log(`Socket conectado sin token: ${client.id}`);
    }

    // Emitir la lista actualizada a todos
    this.sendActiveUsers();
  }

  /**
   * Se llama cuando un socket se desconecta del gateway.
   * Elimina al usuario del mapa y emite la actualización.
   * @param client La instancia del socket desconectado.
   */
  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);

    this.lastSeenAt.delete(client.id);

    if (this.connectedUsers.has(client.id)) {
      this.connectedUsers.delete(client.id);
      this.sendActiveUsers();
      this.logger.log(
        `Usuario desconectado: ${user?.name || client.id} (socket: ${client.id})`,
      );
    }
  }

  /**
   * Emite la lista actual de usuarios conectados (desde el mapa, sin consultar DB)
   * a todos los sockets conectados. Se agrupa por usuario para que una misma
   * persona con varios dispositivos aparezca una sola vez.
   */
  public sendActiveUsers() {
    const users = this.getVisibleUsers();
    this.lastSignature = this.buildSignature(users);
    this.broadcast(users);
  }

  /**
   * Barrido periódico: recalcula la lista visible y solo la difunde si cambió.
   *
   * No desconecta sockets. Un cliente que dejó de latir (app suspendida,
   * proceso congelado, red caída sin FIN) deja de mostrarse y vuelve a
   * aparecer en cuanto el siguiente latido del transporte actualiza
   * `lastSeenAt`.
   */
  @Interval(SWEEP_INTERVAL_MS)
  handlePresenceSweep() {
    const users = this.getVisibleUsers();
    const signature = this.buildSignature(users);

    if (signature === this.lastSignature) return;

    this.lastSignature = signature;
    this.broadcast(users);
    this.logger.debug(`Presencia actualizada: ${users.length} usuario(s)`);
  }

  /**
   * Maneja la solicitud de rankings iniciales.
   */
  @SubscribeMessage('requestInitialRankings')
  handleInitialRankings(client: Socket) {
    this.touch(client.id);
    client.emit('initialRankings', this.rankingService.getCachedRankings());
  }

  /**
   * Maneja la solicitud manual de actualización de usuarios conectados.
   */
  @SubscribeMessage('requestUsersUpdate')
  handleUsersUpdateRequest(client: Socket) {
    this.touch(client.id);
    this.sendActiveUsers();
  }

  /**
   * Maneja la identificación del usuario cuando el cliente no envió un token
   * válido en el handshake (por ejemplo la app mobile).
   *
   * @param client La instancia del socket.
   * @param userData Datos del usuario provenientes del JWT/localStorage.
   */
  @SubscribeMessage('identifyUser')
  handleUserIdentification(
    client: Socket,
    userData: {
      userId: string;
      username: string;
      name: string;
      email: string;
      avatar: string;
      role?: { _id: string; name: string } | null;
      platform?: 'web' | 'mobile';
    },
  ) {
    // Si la sesión ya fue validada con el token, se conserva esa identidad.
    const existing = this.connectedUsers.get(client.id);
    if (existing?.userId) {
      this.touch(client.id);
      return;
    }

    if (!userData?.userId) {
      return;
    }

    const connectedUser: ConnectedUser = {
      socketId: client.id,
      userId: userData.userId,
      username: userData.username || '',
      name: userData.name || userData.username || '',
      email: userData.email || '',
      avatar: userData.avatar || 'default-avatar.svg',
      role: userData.role || null,
      platform: userData.platform || 'web',
      connectedAt: new Date(),
    };

    this.connectedUsers.set(client.id, connectedUser);
    this.touch(client.id);

    this.logger.log(
      `Usuario identificado: ${connectedUser.name} (${connectedUser.platform})`,
    );

    this.sendActiveUsers();
  }

  /**
   * Usuarios identificados con heartbeat reciente, sin duplicados por usuario.
   */
  private getVisibleUsers(): ConnectedUser[] {
    const now = Date.now();
    const byUser = new Map<string, ConnectedUser>();

    for (const user of this.connectedUsers.values()) {
      if (!user.userId) continue; // solo usuarios identificados

      const seen = this.lastSeenAt.get(user.socketId);
      if (!seen || now - seen > STALE_AFTER_MS) continue; // sin heartbeat reciente

      const current = byUser.get(user.userId);
      const currentSeen = current
        ? this.lastSeenAt.get(current.socketId) ?? 0
        : 0;
      if (!current || seen >= currentSeen) {
        byUser.set(user.userId, user);
      }
    }

    return Array.from(byUser.values()).sort((a, b) =>
      (a.name || '').localeCompare(b.name || ''),
    );
  }

  /** Identifica la lista por socket para detectar cambios reales. */
  private buildSignature(users: ConnectedUser[]): string {
    return users.map((u) => `${u.userId}@${u.socketId}`).join('|');
  }

  /** Difunde la lista visible a todos los sockets conectados. */
  private broadcast(users: ConnectedUser[]) {
    if (!this.server) {
      this.logger.error('El servidor WebSocket no está inicializado');
      return;
    }

    this.server.emit('users-update', users);
    this.server.emit('server-status', {
      active: true,
      connectedUsers: users.length,
    });
  }

  /** Marca actividad de un socket (conexión, identificación o heartbeat). */
  private touch(socketId: string) {
    this.lastSeenAt.set(socketId, Date.now());
  }

  /**
   * Valida el JWT enviado en el handshake del socket.
   * @returns El usuario autenticado, o null si no hay token válido.
   */
  private authenticateClient(client: Socket): ConnectedUser | null {
    const token = this.extractToken(client);
    if (!token) return null;

    try {
      const payload = this.jwtService.verify<Record<string, any>>(token);
      if (!payload?.sub) return null;

      return {
        socketId: client.id,
        userId: String(payload.sub),
        username: payload.username ?? '',
        name: payload.name || payload.username || '',
        email: payload.email ?? '',
        avatar: payload.avatar || 'default-avatar.svg',
        role: payload.role ?? null,
        platform: client.handshake?.auth?.platform === 'mobile' ? 'mobile' : 'web',
        connectedAt: new Date(),
      };
    } catch (error) {
      this.logger.warn(
        `Token inválido en la conexión del socket ${client.id}: ${
          (error as Error)?.message
        }`,
      );
      return null;
    }
  }

  /**
   * Obtiene el token desde `auth.token` (socket.io) o del header Authorization.
   */
  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake?.auth?.token;
    if (typeof fromAuth === 'string' && fromAuth.trim()) {
      return fromAuth.trim();
    }

    const header = client.handshake?.headers?.authorization;
    if (
      typeof header === 'string' &&
      header.toLowerCase().startsWith('bearer ')
    ) {
      return header.slice(7).trim();
    }

    return null;
  }
}
