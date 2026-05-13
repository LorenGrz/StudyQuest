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

  // Pomodoro state per party
  private pomodoros = new Map<string, {
    isRunning: boolean;
    timeLeft: number;
    mode: 'work' | 'break';
    workDuration: number;
    breakDuration: number;
    lastTick: number;
  }>();

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
      subjectIds: dto.subjectIds ?? [],
      availability: dto.availability ?? [],
      career: '',
      preferredPartySize: dto.preferredPartySize ?? 4,
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
    @MessageBody() body?: { matchId?: string },
  ) {
    const conn = this.connections.get(socket.id);
    if (!conn) return;
    const matchId = body?.matchId;
    if (!matchId) return;

    const { allAccepted, subjectId, acceptedCount } =
      this.matchmakingService.acceptConfirmation(matchId, conn.userId);

    this.server.to(matchId).emit('match:confirmed', { count: acceptedCount });

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
    @MessageBody() body?: { matchId?: string },
  ) {
    const matchId = body?.matchId;
    if (!matchId) return;
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

    // Enviar estado actual del pomodoro si existe
    const pomodoro = this.pomodoros.get(partyId);
    if (pomodoro) {
      socket.emit('pomodoro:sync', pomodoro);
    }
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
    this.server.to(dto.partyId).emit('chat:message', {
      id: message.id,
      text: message.text,
      userId: message.userId,
      user: message.user
        ? {
            id: message.user.id,
            username: message.user.username,
            displayName: message.user.displayName,
            avatarUrl: message.user.avatarUrl,
          }
        : undefined,
      createdAt: message.createdAt instanceof Date
        ? message.createdAt.toISOString()
        : message.createdAt,
    });
  }

  // ─── Pomodoro ─────────────────────────────────────────────────────────────

  private initPomodoro(partyId: string) {
    if (!this.pomodoros.has(partyId)) {
      this.pomodoros.set(partyId, {
        isRunning: false,
        timeLeft: 25 * 60, // 25 minutes default
        mode: 'work',
        workDuration: 25 * 60,
        breakDuration: 5 * 60,
        lastTick: Date.now(),
      });
    }
    return this.pomodoros.get(partyId)!;
  }

  @SubscribeMessage('pomodoro:start')
  handlePomodoroStart(@ConnectedSocket() socket: Socket, @MessageBody() dto: { partyId: string }) {
    const pomodoro = this.initPomodoro(dto.partyId);
    pomodoro.isRunning = true;
    pomodoro.lastTick = Date.now();
    this.server.to(dto.partyId).emit('pomodoro:sync', pomodoro);
  }

  @SubscribeMessage('pomodoro:pause')
  handlePomodoroPause(@ConnectedSocket() socket: Socket, @MessageBody() dto: { partyId: string }) {
    const pomodoro = this.pomodoros.get(dto.partyId);
    if (pomodoro) {
      pomodoro.isRunning = false;
      this.server.to(dto.partyId).emit('pomodoro:sync', pomodoro);
    }
  }

  @SubscribeMessage('pomodoro:reset')
  handlePomodoroReset(@ConnectedSocket() socket: Socket, @MessageBody() dto: { partyId: string }) {
    const pomodoro = this.initPomodoro(dto.partyId);
    pomodoro.isRunning = false;
    pomodoro.mode = 'work';
    pomodoro.timeLeft = pomodoro.workDuration;
    this.server.to(dto.partyId).emit('pomodoro:sync', pomodoro);
  }

  @SubscribeMessage('pomodoro:config')
  handlePomodoroConfig(
    @ConnectedSocket() socket: Socket,
    @MessageBody() dto: { partyId: string; workDuration: number; breakDuration: number },
  ) {
    const pomodoro = this.initPomodoro(dto.partyId);
    pomodoro.workDuration = dto.workDuration * 60;
    pomodoro.breakDuration = dto.breakDuration * 60;
    if (!pomodoro.isRunning) {
      pomodoro.timeLeft = pomodoro.mode === 'work' ? pomodoro.workDuration : pomodoro.breakDuration;
    }
    this.server.to(dto.partyId).emit('pomodoro:sync', pomodoro);
  }

  @Cron('*/1 * * * * *') // Every second
  runPomodoroTick() {
    const now = Date.now();
    for (const [partyId, pomodoro] of this.pomodoros.entries()) {
      if (pomodoro.isRunning) {
        const delta = Math.floor((now - pomodoro.lastTick) / 1000);
        if (delta >= 1) {
          pomodoro.timeLeft -= delta;
          pomodoro.lastTick = now;

          if (pomodoro.timeLeft <= 0) {
            // Switch mode
            pomodoro.mode = pomodoro.mode === 'work' ? 'break' : 'work';
            pomodoro.timeLeft = pomodoro.mode === 'work' ? pomodoro.workDuration : pomodoro.breakDuration;
            pomodoro.isRunning = false; // Auto-pause on mode switch
            this.server.to(partyId).emit('pomodoro:sync', pomodoro);
            this.server.to(partyId).emit('pomodoro:finished', { mode: pomodoro.mode });
          } else if (pomodoro.timeLeft % 5 === 0) {
            // Sync every 5 seconds to correct drift
            this.server.to(partyId).emit('pomodoro:sync', pomodoro);
          }
        }
      }
    }
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
