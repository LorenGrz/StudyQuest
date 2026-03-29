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
exports.Quest = void 0;
const typeorm_1 = require("typeorm");
const party_entity_1 = require("../parties/party.entity");
const subject_entity_1 = require("../subjects/subject.entity");
const user_entity_1 = require("../users/user.entity");
const quiz_question_entity_1 = require("./quiz-question.entity");
const player_result_entity_1 = require("./player-result.entity");
let Quest = class Quest {
    id;
    title;
    partyId;
    subjectId;
    createdBy;
    party;
    subject;
    creator;
    status;
    sourceText;
    sourcePdfUrl;
    errorMessage;
    startedAt;
    completedAt;
    questions;
    results;
    createdAt;
    updatedAt;
};
exports.Quest = Quest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Quest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], Quest.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'party_id' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Quest.prototype, "partyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'subject_id' }),
    __metadata("design:type", String)
], Quest.prototype, "subjectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', nullable: true }),
    __metadata("design:type", String)
], Quest.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => party_entity_1.Party, (p) => p.quests, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'party_id' }),
    __metadata("design:type", party_entity_1.Party)
], Quest.prototype, "party", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => subject_entity_1.Subject, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'subject_id' }),
    __metadata("design:type", subject_entity_1.Subject)
], Quest.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", user_entity_1.User)
], Quest.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['generating', 'ready', 'active', 'completed', 'failed'],
        default: 'generating',
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], Quest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_text', type: 'text', nullable: true, select: false }),
    __metadata("design:type", Object)
], Quest.prototype, "sourceText", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'source_pdf_url',
        type: 'varchar',
        nullable: true,
        default: null,
    }),
    __metadata("design:type", Object)
], Quest.prototype, "sourcePdfUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'error_message',
        type: 'text',
        nullable: true,
        default: null,
    }),
    __metadata("design:type", Object)
], Quest.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'started_at',
        type: 'timestamptz',
        nullable: true,
        default: null,
    }),
    __metadata("design:type", Object)
], Quest.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'completed_at',
        type: 'timestamptz',
        nullable: true,
        default: null,
    }),
    __metadata("design:type", Object)
], Quest.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => quiz_question_entity_1.QuizQuestion, (q) => q.quest, { cascade: true }),
    __metadata("design:type", Array)
], Quest.prototype, "questions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => player_result_entity_1.PlayerResult, (r) => r.quest, { cascade: true }),
    __metadata("design:type", Array)
], Quest.prototype, "results", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], Quest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], Quest.prototype, "updatedAt", void 0);
exports.Quest = Quest = __decorate([
    (0, typeorm_1.Entity)('quests'),
    (0, typeorm_1.Index)(['partyId', 'status', 'createdAt'])
], Quest);
//# sourceMappingURL=quest.entity.js.map