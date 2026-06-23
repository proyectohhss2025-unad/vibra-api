import {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
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

@WebSocketGateway({ cors: true })
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // Mapa para almacenar los usuarios conectados (key = socketId)
  private connectedUsers: Map<string, ConnectedUser> = new Map();

  constructor(private readonly rankingService: RankingService) {}

  afterInit(server: Server) {
    // No se requiere inicialización adicional
  }

  /**
   * Se llama cuando un socket se conecta al gateway.
   * Agrega una entrada temporal en el mapa y emite la lista actual.
   * @param client La instancia del socket conectado.
   */
  async handleConnection(client: Socket) {
    console.log(`Socket conectado: ${client.id}`);

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
    const userName = user?.name || client.id;
    if (this.connectedUsers.has(client.id)) {
      this.connectedUsers.delete(client.id);
      this.sendActiveUsers();
      console.log(`Usuario desconectado: ${userName} (socket: ${client.id})`);
    }
  }

  /**
   * Emite la lista actual de usuarios conectados (desde el mapa, sin consultar DB)
   * a todos los sockets conectados.
   */
  public sendActiveUsers() {
    const users = Array.from(this.connectedUsers.values()).filter(
      (u) => u.userId !== '', // solo usuarios identificados
    );

    console.log(`Emitiendo actualización: ${users.length} usuarios conectados`);

    if (this.server) {
      this.server.emit('users-update', users);
      this.server.emit('server-status', {
        active: true,
        connectedUsers: users.length,
      });
    } else {
      console.error('Error: El servidor WebSocket no está inicializado');
    }
  }

  /**
   * Maneja la solicitud de rankings iniciales.
   */
  @SubscribeMessage('requestInitialRankings')
  handleInitialRankings(client: Socket) {
    client.emit('initialRankings', this.rankingService.getCachedRankings());
  }

  /**
   * Maneja la solicitud manual de actualización de usuarios conectados.
   */
  @SubscribeMessage('requestUsersUpdate')
  handleUsersUpdateRequest(client: Socket) {
    console.log(`Socket ${client.id} solicitó actualización de usuarios`);
    this.sendActiveUsers();
  }

  /**
   * Maneja la identificación del usuario cuando se conecta desde web o mobile.
   * El cliente envía sus datos (userId, username, name, email, avatar, role, platform)
   * y se registra en el mapa de conectados.
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
    // Si el socket ya tenía una entrada previa (con userId vacío), la reemplazamos
    const connectedUser: ConnectedUser = {
      socketId: client.id,
      userId: userData.userId,
      username: userData.username,
      name: userData.name || userData.username,
      email: userData.email || '',
      avatar: userData.avatar || 'default-avatar.svg',
      role: userData.role || null,
      platform: userData.platform || 'web',
      connectedAt: new Date(),
    };

    this.connectedUsers.set(client.id, connectedUser);

    console.log(
      `Usuario identificado: ${connectedUser.name} (${connectedUser.platform})`,
    );

    this.sendActiveUsers();
  }
}
