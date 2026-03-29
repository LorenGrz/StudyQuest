import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuid } from 'uuid';
import { MatchmakingService, QueueCandidate } from './matchmaking.service';
import { PartiesService } from '../../modules/parties/parties.service';
import { JoinQueueDto, SendChatMessageDto } from '../../common/dto';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class MatchmakingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MatchmakingGateway.name);
  private connections = new Map<string, { userId: string; partyId?: string }>();

  constructor(
    private readonly matchmakingService: MatchmakingService,
    private readonly partiesService: PartiesService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token =
        socket.handshake.auth?.token ??
        socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) throw new Error('Sin token');
      const payload = this.jwtService.verify(token);
      this.connections.set(socket.id, { userId: payload.sub });
      this.logger.log(`[WS] Conectado: ${payload.sub}`);
    } catch {
      socket.emit('error', { code: 'UNAUTHORIZED', message: 'Token inválido' });
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    const conn = this.connections.get(socket.id);
    if (!conn) return;
    this.matchmakingService.removeFromQueue(conn.userId);
    if (conn.partyId) {
      await this.partiesService.setOnlineStatus(
        conn.partyId,
        conn.userId,
        false,
      );
      this.server.to(conn.partyId).emit('party:member-online', {
        userId: conn.userId,
        isOnline: false,
      });
    }
    this.connections.delete(socket.id);
  }

  @SubscribeMessage('match:join-queue')
  handleJoinQueue(
    @ConnectedSocket() socket: Socket,
    @MessageBody() dto: JoinQueueDto,
  ) {
    const conn = this.connections.get(socket.id);
    if (!conn) return;

    if (this.matchmakingService.isInQueue(conn.userId)) {
      socket.emit('error', { code: 'ALREADY_IN_QUEUE' });
      return;
    }

    const candidate: QueueCandidate = {
      userId: conn.userId,
      socketId: socket.id,
      subjectIds: dto.subjectIds,
      availability: dto.availability,
      career: '',
      preferredPartySize: dto.preferredPartySize,
      joinedAt: new Date(),
      threshold: 0.5,
    };

    this.matchmakingService.addToQueue(candidate);
    socket.emit('match:queued', {
      queueSize: this.matchmakingService.getQueueSize(),
    });
  }

  @SubscribeMessage('match:leave-queue')
  handleLeaveQueue(@ConnectedSocket() socket: Socket) {
    const conn = this.connections.get(socket.id);
    if (!conn) return;
    this.matchmakingService.removeFromQueue(conn.userId);
    socket.emit('match:left-queue');
  }

  @SubscribeMessage('match:accept')
  async handleAccept(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { matchId }: { matchId: string },
  ) {
    const conn = this.connections.get(socket.id);
    if (!conn) return;

    const { allAccepted, subjectId } =
      this.matchmakingService.acceptConfirmation(matchId, conn.userId);

    if (allAccepted) {
      const sockets = await this.server.in(matchId).fetchSockets();
      const memberIds = sockets
        .map((s) => this.connections.get(s.id)?.userId)
        .filter(Boolean) as string[];

      const party = await this.partiesService.createParty(subjectId, memberIds);

      if (!party) return; // ← esta línea es el fix

      for (const s of sockets) {
        s.leave(matchId);
        s.join(party.id);
        const c = this.connections.get(s.id);
        if (c) c.partyId = party.id;
      }

      this.server.to(party.id).emit('match:ready', {
        partyId: party.id,
        party: { id: party.id, subjectId, memberCount: memberIds.length },
      });
    }
  }

  @SubscribeMessage('match:reject')
  handleReject(
    @ConnectedSocket() _socket: Socket,
    @MessageBody() { matchId }: { matchId: string },
  ) {
    this.matchmakingService.rejectConfirmation(matchId);
    this.server.to(matchId).emit('match:timeout', {
      message: 'El match fue rechazado.',
    });
  }

  @SubscribeMessage('party:join')
  async handlePartyJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { partyId }: { partyId: string },
  ) {
    const conn = this.connections.get(socket.id);
    if (!conn) return;
    socket.join(partyId);
    conn.partyId = partyId;
    await this.partiesService.setOnlineStatus(partyId, conn.userId, true);
    this.server.to(partyId).emit('party:member-online', {
      userId: conn.userId,
      isOnline: true,
    });
  }

  @SubscribeMessage('party:leave')
  async handlePartyLeave(@ConnectedSocket() socket: Socket) {
    const conn = this.connections.get(socket.id);
    if (!conn?.partyId) return;
    const { partyId } = conn;
    socket.leave(partyId);
    conn.partyId = undefined;
    await this.partiesService.setOnlineStatus(partyId, conn.userId, false);
    this.server.to(partyId).emit('party:member-online', {
      userId: conn.userId,
      isOnline: false,
    });
  }

  @SubscribeMessage('party:chat')
  async handleChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() dto: SendChatMessageDto & { partyId: string },
  ) {
    const conn = this.connections.get(socket.id);
    if (!conn) return;
    const message = await this.partiesService.addChatMessage(
      dto.partyId,
      conn.userId,
      dto.text,
    );
    this.server.to(dto.partyId).emit('party:message', {
      userId: conn.userId,
      text: message.text,
      sentAt: message.createdAt,
    });
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  runMatchmaking() {
    if (this.matchmakingService.getQueueSize() < 2) return;
    const groups = this.matchmakingService.findMatches();

    for (const group of groups) {
      const matchId = uuid();

      for (const candidate of group.members) {
        const s = this.server.sockets.sockets.get(candidate.socketId);
        if (s) s.join(matchId);
        this.matchmakingService.removeFromQueue(candidate.userId);
      }

      this.server.to(matchId).emit('match:found', {
        matchId,
        memberCount: group.members.length,
        subjectId: group.subjectId,
        members: group.members.map((m) => ({ userId: m.userId })),
      });

      this.matchmakingService.initConfirmation(
        matchId,
        group.members.map((m) => m.userId),
        group.subjectId,
        () => {
          this.server.to(matchId).emit('match:timeout', {
            message: 'Tiempo agotado.',
          });
        },
      );
    }
  }
}
