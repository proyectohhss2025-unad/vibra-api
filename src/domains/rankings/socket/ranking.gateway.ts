import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { RankingService } from '../ranking.service';

@WebSocketGateway({ namespace: '/realtime' })
export class RankingGateway {
    @WebSocketServer() server: Server;

    constructor(private readonly rankingService: RankingService) { }

    /**
     * Handles the 'joinRankingRoom' event.
     * @param client The client that sent the event.
     * @param data The data sent with the event.
     * @returns void
     * @example
     * client.emit('joinRankingRoom', { roomId: '123' });
     * @example
     * client.on('initialRankings', (rankings) => { 
     *   // handle rankings
     * });
     * */
    @SubscribeMessage('joinRankingRoom')
    handleJoin(client: any) {
        client.join('rankings');
        this.rankingService.getCachedRankings().then(rankings => {
            client.emit('initialRankings', rankings);
        });
    }

    /**
     * Handles the 'requestHistoricalRankings' event.
     * @param client The client that sent the event.
     * @param days The number of days to get the rankings for.
     * @returns void
     * @example
     * client.emit('requestHistoricalRankings', 7);
     * @example
     * client.on('historicalRankings', (rankings) => {
     *   // handle rankings
     * });
     * */
    @SubscribeMessage('requestHistoricalRankings')
    async handleHistoricalRequest(client: any, days: number) {
        const historical = await this.rankingService.getHistoricalRankings(days);
        client.emit('historicalRankings', historical);
    }
}