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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Party = void 0;
const typeorm_1 = require("typeorm");
const subject_entity_1 = require("../subjects/subject.entity");
const party_member_entity_1 = require("./party-member.entity");
const chat_message_entity_1 = require("./chat-message.entity");
const quest_entity_1 = require("../quests/quest.entity");
let Party = class Party {
    id;
    subjectId;
    subject;
    status;
    maxMembers;
    members;
    chatMessages;
    quests;
    closedAt;
    createdAt;
    updatedAt;
};
exports.Party = Party;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Party.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'subject_id' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Party.prototype, "subjectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => subject_entity_1.Subject, (s) => s.parties, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'subject_id' }),
    __metadata("design:type", subject_entity_1.Subject)
], Party.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['forming', 'active', 'closed'],
        default: 'forming',
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Party.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_members', type: 'smallint', default: 4 }),
    __metadata("design:type", Number)
], Party.prototype, "maxMembers", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => party_member_entity_1.PartyMember, (pm) => pm.party, { cascade: true }),
    __metadata("design:type", Array)
], Party.prototype, "members", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => chat_message_entity_1.ChatMessage, (cm) => cm.party, { cascade: true }),
    __metadata("design:type", Array)
], Party.prototype, "chatMessages", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => quest_entity_1.Quest, (q) => q.party),
    __metadata("design:type", Array)
], Party.prototype, "quests", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'closed_at',
        type: 'timestamptz',
        nullable: true,
        default: null,
    }),
    __metadata("design:type", Object)
], Party.prototype, "closedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], Party.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], Party.prototype, "updatedAt", void 0);
exports.Party = Party = __decorate([
    (0, typeorm_1.Entity)('parties')
], Party);
//# sourceMappingURL=party.entity.js.map