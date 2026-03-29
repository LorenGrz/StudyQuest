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
exports.User = void 0;
const typeorm_1 = require("typeorm");
const subject_entity_1 = require("../subjects/subject.entity");
const party_member_entity_1 = require("../parties/party-member.entity");
let User = class User {
    id;
    email;
    passwordHash;
    username;
    displayName;
    avatarUrl;
    university;
    career;
    semester;
    enrolledSubjects;
    partyMemberships;
    availability;
    stats;
    refreshTokens;
    isActive;
    createdAt;
    updatedAt;
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 255 }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_hash', select: false }),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 30 }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'display_name', length: 60 }),
    __metadata("design:type", String)
], User.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'avatar_url',
        type: 'varchar',
        nullable: true,
        default: null,
    }),
    __metadata("design:type", Object)
], User.prototype, "avatarUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], User.prototype, "university", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], User.prototype, "career", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint', default: 1 }),
    __metadata("design:type", Number)
], User.prototype, "semester", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => subject_entity_1.Subject, (s) => s.enrolledUsers, { eager: false }),
    (0, typeorm_1.JoinTable)({
        name: 'user_subjects',
        joinColumn: { name: 'user_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'subject_id', referencedColumnName: 'id' },
    }),
    __metadata("design:type", Array)
], User.prototype, "enrolledSubjects", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => party_member_entity_1.PartyMember, (pm) => pm.user),
    __metadata("design:type", Array)
], User.prototype, "partyMemberships", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], User.prototype, "availability", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        default: {
            xp: 0,
            level: 0,
            quizzesPlayed: 0,
            quizzesWon: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastPlayedAt: null,
        },
    }),
    __metadata("design:type", Object)
], User.prototype, "stats", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refresh_tokens', type: 'jsonb', default: [], select: false }),
    __metadata("design:type", Array)
], User.prototype, "refreshTokens", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users'),
    (0, typeorm_1.Index)(['university', 'career'])
], User);
//# sourceMappingURL=user.entity.js.map