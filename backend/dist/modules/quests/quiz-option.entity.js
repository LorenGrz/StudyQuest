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
exports.QuizOption = void 0;
const typeorm_1 = require("typeorm");
const quiz_question_entity_1 = require("./quiz-question.entity");
let QuizOption = class QuizOption {
    id;
    questionId;
    question;
    position;
    text;
    isCorrect;
};
exports.QuizOption = QuizOption;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], QuizOption.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'question_id' }),
    __metadata("design:type", String)
], QuizOption.prototype, "questionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => quiz_question_entity_1.QuizQuestion, (q) => q.options, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'question_id' }),
    __metadata("design:type", quiz_question_entity_1.QuizQuestion)
], QuizOption.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint' }),
    __metadata("design:type", Number)
], QuizOption.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], QuizOption.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_correct', default: false }),
    __metadata("design:type", Boolean)
], QuizOption.prototype, "isCorrect", void 0);
exports.QuizOption = QuizOption = __decorate([
    (0, typeorm_1.Entity)('quiz_options'),
    (0, typeorm_1.Index)(['questionId', 'position'])
], QuizOption);
//# sourceMappingURL=quiz-option.entity.js.map