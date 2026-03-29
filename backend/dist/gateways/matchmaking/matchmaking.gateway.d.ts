import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MatchmakingService } from './matchmaking.service';
import { PartiesService } from '../../modules/parties/parties.service';
import { JoinQueueDto, SendChatMessageDto } from '../../common/dto';
export declare class MatchmakingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly matchmakingService;
    private readonly partiesService;
    private readonly jwtService;
    server: Server;
    private readonly logger;
    private connections;
    constructor(matchmakingService: MatchmakingService, partiesService: PartiesService, jwtService: JwtService);
    handleConnection(socket: Socket): Promise<void>;
    handleDisconnect(socket: Socket): Promise<void>;
    handleJoinQueue(socket: Socket, dto: JoinQueueDto): void;
    handleLeaveQueue(socket: Socket): void;
    handleAccept(socket: Socket, { matchId }: {
        matchId: string;
    }): Promise<void>;
    handleReject(_socket: Socket, { matchId }: {
        matchId: string;
    }): void;
    handlePartyJoin(socket: Socket, { partyId }: {
        partyId: string;
    }): Promise<void>;
    handlePartyLeave(socket: Socket): Promise<void>;
    handleChat(socket: Socket, dto: SendChatMessageDto & {
        partyId: string;
    }): Promise<void>;
    runMatchmaking(): void;
}
