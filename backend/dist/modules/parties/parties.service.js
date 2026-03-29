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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartiesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const party_entity_1 = require("./party.entity");
const party_member_entity_1 = require("./party-member.entity");
const chat_message_entity_1 = require("./chat-message.entity");
let PartiesService = class PartiesService {
    partyRepo;
    memberRepo;
    chatRepo;
    dataSource;
    constructor(partyRepo, memberRepo, chatRepo, dataSource) {
        this.partyRepo = partyRepo;
        this.memberRepo = memberRepo;
        this.chatRepo = chatRepo;
        this.dataSource = dataSource;
    }
    async createParty(subjectId, memberIds, maxMembers = 4) {
        return this.dataSource.transaction(async (em) => {
            const party = em.create(party_entity_1.Party, {
                subjectId,
                maxMembers,
                status: 'active',
            });
            await em.save(party);
            const members = memberIds.map((userId) => em.create(party_member_entity_1.PartyMember, { partyId: party.id, userId, isOnline: true }));
            await em.save(members);
            return em.findOne(party_entity_1.Party, {
                where: { id: party.id },
                relations: ['subject', 'members', 'members.user'],
            });
        });
    }
    async findById(id) {
        const party = await this.partyRepo.findOne({
            where: { id },
            relations: ['subject', 'members', 'members.user', 'quests'],
        });
        if (!party)
            throw new common_1.NotFoundException('Party no encontrada');
        return party;
    }
    async findByUser(userId) {
        return this.partyRepo
            .createQueryBuilder('p')
            .innerJoin('p.members', 'pm', 'pm.user_id = :userId', { userId })
            .leftJoinAndSelect('p.subject', 's')
            .leftJoinAndSelect('p.members', 'allMembers')
            .leftJoinAndSelect('allMembers.user', 'u')
            .leftJoinAndSelect('p.quests', 'q')
            .where("p.status != 'closed'")
            .orderBy('p.updated_at', 'DESC')
            .getMany();
    }
    assertMember(party, userId) {
        const isMember = party.members?.some((m) => m.userId === userId);
        if (!isMember)
            throw new common_1.ForbiddenException('No sos miembro de esta party');
    }
    async setOnlineStatus(partyId, userId, isOnline) {
        await this.memberRepo.update({ partyId, userId }, { isOnline });
    }
    async addXpToMember(partyId, userId, xp) {
        await this.memberRepo
            .createQueryBuilder()
            .update()
            .set({ partyXp: () => `party_xp + ${xp}` })
            .where('party_id = :partyId AND user_id = :userId', { partyId, userId })
            .execute();
    }
    async closeParty(partyId) {
        await this.partyRepo.update(partyId, {
            status: 'closed',
            closedAt: new Date(),
        });
    }
    async addChatMessage(partyId, userId, text) {
        const msg = this.chatRepo.create({ partyId, userId, text: text.trim() });
        return this.chatRepo.save(msg);
    }
    async getChatHistory(partyId, limit = 100) {
        const msgs = await this.chatRepo.find({
            where: { partyId },
            relations: ['user'],
            order: { createdAt: 'DESC' },
            take: limit,
        });
        return msgs.reverse();
    }
};
exports.PartiesService = PartiesService;
exports.PartiesService = PartiesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(party_entity_1.Party)),
    __param(1, (0, typeorm_1.InjectRepository)(party_member_entity_1.PartyMember)),
    __param(2, (0, typeorm_1.InjectRepository)(chat_message_entity_1.ChatMessage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], PartiesService);
//# sourceMappingURL=parties.service.js.map