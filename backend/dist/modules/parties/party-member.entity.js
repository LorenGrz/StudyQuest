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
exports.PartyMember = void 0;
const typeorm_1 = require("typeorm");
const party_entity_1 = require("./party.entity");
const user_entity_1 = require("../users/user.entity");
let PartyMember = class PartyMember {
    id;
    partyId;
    userId;
    party;
    user;
    partyXp;
    isOnline;
    joinedAt;
};
exports.PartyMember = PartyMember;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PartyMember.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'party_id' }),
    __metadata("design:type", String)
], PartyMember.prototype, "partyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", String)
], PartyMember.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => party_entity_1.Party, (p) => p.members, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'party_id' }),
    __metadata("design:type", party_entity_1.Party)
], PartyMember.prototype, "party", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (u) => u.partyMemberships, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], PartyMember.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'party_xp', default: 0 }),
    __metadata("design:type", Number)
], PartyMember.prototype, "partyXp", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_online', default: false }),
    __metadata("design:type", Boolean)
], PartyMember.prototype, "isOnline", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'joined_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PartyMember.prototype, "joinedAt", void 0);
exports.PartyMember = PartyMember = __decorate([
    (0, typeorm_1.Entity)('party_members'),
    (0, typeorm_1.Unique)(['partyId', 'userId']),
    (0, typeorm_1.Index)(['userId'])
], PartyMember);
//# sourceMappingURL=party-member.entity.js.map