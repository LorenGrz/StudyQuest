"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MatchmakingGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const jwt_1 = require("@nestjs/jwt");
const uuid_1 = require("uuid");
const matchmaking_service_1 = require("./matchmaking.service");
const parties_service_1 = require("../../modules/parties/parties.service");
const dto_1 = require("../../common/dto");
let MatchmakingGateway = MatchmakingGateway_1 = class MatchmakingGateway {
    matchmakingService;
    partiesService;
    jwtService;
    server;
    logger = new common_1.Logger(MatchmakingGateway_1.name);
    connections = new Map();
    constructor(matchmakingService, partiesService, jwtService) {
        this.matchmakingService = matchmakingService;
        this.partiesService = partiesService;
        this.jwtService = jwtService;
    }
    async handleConnection(socket) {
        try {
            const token = socket.handshake.auth?.token ??
                socket.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token)
                throw new Error('Sin token');
            const payload = this.jwtService.verify(token);
            this.connections.set(socket.id, { userId: payload.sub });
            this.logger.log(`[WS] Conectado: ${payload.sub}`);
        }
        catch {
            socket.emit('error', { code: 'UNAUTHORIZED', message: 'Token inválido' });
            socket.disconnect();
        }
    }
    async handleDisconnect(socket) {
        const conn = this.connections.get(socket.id);
        if (!conn)
            return;
        this.matchmakingService.removeFromQueue(conn.userId);
        if (conn.partyId) {
            await this.partiesService.setOnlineStatus(conn.partyId, conn.userId, false);
            this.server.to(conn.partyId).emit('party:member-online', {
                userId: conn.userId,
                isOnline: false,
            });
        }
        this.connections.delete(socket.id);
    }
    handleJoinQueue(socket, dto) {
        const conn = this.connections.get(socket.id);
        if (!conn)
            return;
        if (this.matchmakingService.isInQueue(conn.userId)) {
            socket.emit('error', { code: 'ALREADY_IN_QUEUE' });
            return;
        }
        const candidate = {
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
    handleLeaveQueue(socket) {
        const conn = this.connections.get(socket.id);
        if (!conn)
            return;
        this.matchmakingService.removeFromQueue(conn.userId);
        socket.emit('match:left-queue');
    }
    async handleAccept(socket, { matchId }) {
        const conn = this.connections.get(socket.id);
        if (!conn)
            return;
        const { allAccepted, subjectId } = this.matchmakingService.acceptConfirmation(matchId, conn.userId);
        if (allAccepted) {
            const sockets = await this.server.in(matchId).fetchSockets();
            const memberIds = sockets
                .map((s) => this.connections.get(s.id)?.userId)
                .filter(Boolean);
            const party = await this.partiesService.createParty(subjectId, memberIds);
            if (!party)
                return;
            for (const s of sockets) {
                s.leave(matchId);
                s.join(party.id);
                const c = this.connections.get(s.id);
                if (c)
                    c.partyId = party.id;
            }
            this.server.to(party.id).emit('match:ready', {
                partyId: party.id,
                party: { id: party.id, subjectId, memberCount: memberIds.length },
            });
        }
    }
    handleReject(_socket, { matchId }) {
        this.matchmakingService.rejectConfirmation(matchId);
        this.server.to(matchId).emit('match:timeout', {
            message: 'El match fue rechazado.',
        });
    }
    async handlePartyJoin(socket, { partyId }) {
        const conn = this.connections.get(socket.id);
        if (!conn)
            return;
        socket.join(partyId);
        conn.partyId = partyId;
        await this.partiesService.setOnlineStatus(partyId, conn.userId, true);
        this.server.to(partyId).emit('party:member-online', {
            userId: conn.userId,
            isOnline: true,
        });
    }
    async handlePartyLeave(socket) {
        const conn = this.connections.get(socket.id);
        if (!conn?.partyId)
            return;
        const { partyId } = conn;
        socket.leave(partyId);
        conn.partyId = undefined;
        await this.partiesService.setOnlineStatus(partyId, conn.userId, false);
        this.server.to(partyId).emit('party:member-online', {
            userId: conn.userId,
            isOnline: false,
        });
    }
    async handleChat(socket, dto) {
        const conn = this.connections.get(socket.id);
        if (!conn)
            return;
        const message = await this.partiesService.addChatMessage(dto.partyId, conn.userId, dto.text);
        this.server.to(dto.partyId).emit('party:message', {
            userId: conn.userId,
            text: message.text,
            sentAt: message.createdAt,
        });
    }
    runMatchmaking() {
        if (this.matchmakingService.getQueueSize() < 2)
            return;
        const groups = this.matchmakingService.findMatches();
        for (const group of groups) {
            const matchId = (0, uuid_1.v4)();
            for (const candidate of group.members) {
                const s = this.server.sockets.sockets.get(candidate.socketId);
                if (s)
                    s.join(matchId);
                this.matchmakingService.removeFromQueue(candidate.userId);
            }
            this.server.to(matchId).emit('match:found', {
                matchId,
                memberCount: group.members.length,
                subjectId: group.subjectId,
                members: group.members.map((m) => ({ userId: m.userId })),
            });
            this.matchmakingService.initConfirmation(matchId, group.members.map((m) => m.userId), group.subjectId, () => {
                this.server.to(matchId).emit('match:timeout', {
                    message: 'Tiempo agotado.',
                });
            });
        }
    }
};
exports.MatchmakingGateway = MatchmakingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], MatchmakingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('match:join-queue'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket,
        dto_1.JoinQueueDto]),
    __metadata("design:returntype", void 0)
], MatchmakingGateway.prototype, "handleJoinQueue", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('match:leave-queue'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], MatchmakingGateway.prototype, "handleLeaveQueue", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('match:accept'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "handleAccept", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('match:reject'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], MatchmakingGateway.prototype, "handleReject", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('party:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "handlePartyJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('party:leave'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "handlePartyLeave", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('party:chat'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "handleChat", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MatchmakingGateway.prototype, "runMatchmaking", null);
exports.MatchmakingGateway = MatchmakingGateway = MatchmakingGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [matchmaking_service_1.MatchmakingService,
        parties_service_1.PartiesService,
        jwt_1.JwtService])
], MatchmakingGateway);
//# sourceMappingURL=matchmaking.gateway.js.map