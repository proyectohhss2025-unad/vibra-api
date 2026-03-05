import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class EventsGateway {
    @WebSocketServer()
    server: Server;

    /**
     * Emits a custom event to all connected clients.
     * 
     * @param {any} data - The data to be emitted in the event.
     */
    emitEvent(data: any) {
        this.server.emit('customNameEvent', data);
    }

    /**
     * Handles the 'clientEvent' message from a connected client.
     * 
     * @param {string} data - The message received from the client.
     * @param {Socket} client - The socket representing the connected client.
     */
    @SubscribeMessage('clientEvent')
    handleClientEvent(@MessageBody() data: string, @ConnectedSocket() client: Socket) {
        //console.log('Mensaje recibido del cliente:', data);
        this.server.emit('customNameEvent', `El servidor responde: ${data}`);
    }
}