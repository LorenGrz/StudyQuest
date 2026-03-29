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
exports.QuizQuestion = void 0;
const typeorm_1 = require("typeorm");
const quest_entity_1 = require("./quest.entity");
const quiz_option_entity_1 = require("./quiz-option.entity");
let QuizQuestion = class QuizQuestion {
    id;
    questId;
    quest;
    position;
    text;
    correctIndex;
    explanation;
    topic;
    difficulty;
    options;
};
exports.QuizQuestion = QuizQuestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], QuizQuestion.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quest_id' }),
    __metadata("design:type", String)
], QuizQuestion.prototype, "questId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => quest_entity_1.Quest, (q) => q.questions, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'quest_id' }),
    __metadata("design:type", quest_entity_1.Quest)
], QuizQuestion.prototype, "quest", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint' }),
    __metadata("design:type", Number)
], QuizQuestion.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], QuizQuestion.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'correct_index', type: 'smallint' }),
    __metadata("design:type", Number)
], QuizQuestion.prototype, "correctIndex", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], QuizQuestion.prototype, "explanation", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200, nullable: true }),
    __metadata("design:type", String)
], QuizQuestion.prototype, "topic", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['easy', 'medium', 'hard'], default: 'medium' }),
    __metadata("design:type", String)
], QuizQuestion.prototype, "difficulty", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => quiz_option_entity_1.QuizOption, (o) => o.question, {
        cascade: true,
        eager: true,
    }),
    __metadata("design:type", Array)
], QuizQuestion.prototype, "options", void 0);
exports.QuizQuestion = QuizQuestion = __decorate([
    (0, typeorm_1.Entity)('quiz_questions'),
    (0, typeorm_1.Index)(['questId', 'position'])
], QuizQuestion);
//# sourceMappingURL=quiz-question.entity.js.map