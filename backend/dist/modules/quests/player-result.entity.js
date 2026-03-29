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
exports.PlayerResult = void 0;
const typeorm_1 = require("typeorm");
const quest_entity_1 = require("./quest.entity");
const user_entity_1 = require("../users/user.entity");
let PlayerResult = class PlayerResult {
    id;
    questId;
    userId;
    quest;
    user;
    score;
    correctAnswers;
    xpEarned;
    totalTimeMs;
    createdAt;
};
exports.PlayerResult = PlayerResult;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PlayerResult.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quest_id' }),
    __metadata("design:type", String)
], PlayerResult.prototype, "questId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", String)
], PlayerResult.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => quest_entity_1.Quest, (q) => q.results, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'quest_id' }),
    __metadata("design:type", quest_entity_1.Quest)
], PlayerResult.prototype, "quest", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], PlayerResult.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], PlayerResult.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'correct_answers', default: 0 }),
    __metadata("design:type", Number)
], PlayerResult.prototype, "correctAnswers", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'xp_earned', default: 0 }),
    __metadata("design:type", Number)
], PlayerResult.prototype, "xpEarned", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_time_ms', default: 0 }),
    __metadata("design:type", Number)
], PlayerResult.prototype, "totalTimeMs", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PlayerResult.prototype, "createdAt", void 0);
exports.PlayerResult = PlayerResult = __decorate([
    (0, typeorm_1.Entity)('player_results'),
    (0, typeorm_1.Unique)(['questId', 'userId']),
    (0, typeorm_1.Index)(['questId', 'score'])
], PlayerResult);
//# sourceMappingURL=player-result.entity.js.map