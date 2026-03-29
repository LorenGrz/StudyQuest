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
var QuestsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const quest_entity_1 = require("./quest.entity");
const quiz_question_entity_1 = require("./quiz-question.entity");
const quiz_option_entity_1 = require("./quiz-option.entity");
const player_result_entity_1 = require("./player-result.entity");
const ai_service_1 = require("../ai/ai.service");
const parties_service_1 = require("../parties/parties.service");
const users_service_1 = require("../users/users.service");
const XP_CORRECT_BASE = 100;
const XP_SPEED_BONUS = 50;
const XP_SPEED_FAST_MS = 5000;
let QuestsService = QuestsService_1 = class QuestsService {
    questRepo;
    questionRepo;
    optionRepo;
    resultRepo;
    dataSource;
    aiService;
    partiesService;
    usersService;
    eventEmitter;
    logger = new common_1.Logger(QuestsService_1.name);
    constructor(questRepo, questionRepo, optionRepo, resultRepo, dataSource, aiService, partiesService, usersService, eventEmitter) {
        this.questRepo = questRepo;
        this.questionRepo = questionRepo;
        this.optionRepo = optionRepo;
        this.resultRepo = resultRepo;
        this.dataSource = dataSource;
        this.aiService = aiService;
        this.partiesService = partiesService;
        this.usersService = usersService;
        this.eventEmitter = eventEmitter;
    }
    async createQuest(dto, userId, file) {
        const party = await this.partiesService.findById(dto.partyId);
        this.partiesService.assertMember(party, userId);
        if (!dto.textContent && !file) {
            throw new common_1.BadRequestException('Debés proporcionar texto o un PDF');
        }
        const quest = await this.questRepo.save(this.questRepo.create({
            title: dto.title,
            partyId: dto.partyId,
            subjectId: party.subjectId,
            createdBy: userId,
            status: 'generating',
            sourcePdfUrl: file ? `/uploads/${file.filename}` : null,
        }));
        this.generateInBackground(quest.id, dto.textContent, file?.buffer).catch((err) => this.logger.error(`Fallo generación quest ${quest.id}: ${err.message}`));
        return quest;
    }
    async generateInBackground(questId, textContent, pdfBuffer) {
        try {
            const rawQuestions = pdfBuffer
                ? await this.aiService.generateQuestionsFromPdf(pdfBuffer)
                : await this.aiService.generateQuestionsFromText(textContent);
            await this.dataSource.transaction(async (em) => {
                for (let i = 0; i < rawQuestions.length; i++) {
                    const raw = rawQuestions[i];
                    const question = em.create(quiz_question_entity_1.QuizQuestion, {
                        questId,
                        position: i,
                        text: raw.text,
                        correctIndex: raw.correctIndex,
                        explanation: raw.explanation,
                        topic: raw.topic,
                        difficulty: raw.difficulty,
                    });
                    await em.save(question);
                    const options = raw.options.map((optText, j) => em.create(quiz_option_entity_1.QuizOption, {
                        questionId: question.id,
                        position: j,
                        text: optText,
                        isCorrect: j === raw.correctIndex,
                    }));
                    await em.save(options);
                }
                await em.update(quest_entity_1.Quest, questId, { status: 'ready' });
            });
            this.eventEmitter.emit('quest.ready', { questId });
            this.logger.log(`Quest ${questId}: ${rawQuestions.length} preguntas generadas`);
        }
        catch (err) {
            await this.questRepo.update(questId, {
                status: 'failed',
                errorMessage: err.message,
            });
            this.eventEmitter.emit('quest.failed', { questId, error: err.message });
        }
    }
    async findById(id) {
        const quest = await this.questRepo.findOne({
            where: { id },
            relations: ['questions', 'questions.options', 'results'],
        });
        if (!quest)
            throw new common_1.NotFoundException('Quest no encontrado');
        return quest;
    }
    async findByParty(partyId) {
        return this.questRepo.find({
            where: { partyId },
            select: [
                'id',
                'title',
                'status',
                'createdAt',
                'startedAt',
                'completedAt',
            ],
            order: { createdAt: 'DESC' },
        });
    }
    async getQuestForPlay(questId) {
        const quest = await this.questRepo
            .createQueryBuilder('q')
            .leftJoinAndSelect('q.questions', 'qq')
            .leftJoinAndSelect('qq.options', 'o')
            .where('q.id = :id', { id: questId })
            .select([
            'q.id',
            'q.title',
            'q.status',
            'q.startedAt',
            'qq.id',
            'qq.text',
            'qq.topic',
            'qq.difficulty',
            'qq.position',
            'o.id',
            'o.text',
            'o.position',
        ])
            .orderBy('qq.position', 'ASC')
            .addOrderBy('o.position', 'ASC')
            .getOne();
        if (!quest)
            throw new common_1.NotFoundException('Quest no encontrado');
        if (!['ready', 'active'].includes(quest.status)) {
            throw new common_1.BadRequestException(`Quest no disponible (estado: ${quest.status})`);
        }
        return quest;
    }
    async startQuest(questId) {
        const quest = await this.findById(questId);
        if (quest.status !== 'ready') {
            throw new common_1.BadRequestException('El quest no está listo');
        }
        await this.questRepo.update(questId, {
            status: 'active',
            startedAt: new Date(),
        });
        return { ...quest, status: 'active' };
    }
    async submitAnswer(dto, userId) {
        const question = await this.questionRepo.findOne({
            where: { questId: dto.questId, position: dto.questionIndex },
            select: ['id', 'correctIndex', 'explanation'],
        });
        if (!question)
            throw new common_1.BadRequestException('Pregunta inválida');
        const isCorrect = question.correctIndex === dto.selectedOption;
        const xpEarned = isCorrect
            ? XP_CORRECT_BASE +
                (dto.timeSpentMs < XP_SPEED_FAST_MS ? XP_SPEED_BONUS : 0)
            : 0;
        const existing = await this.resultRepo.findOne({
            where: { questId: dto.questId, userId },
        });
        if (existing) {
            await this.resultRepo.update(existing.id, {
                score: existing.score + xpEarned,
                correctAnswers: existing.correctAnswers + (isCorrect ? 1 : 0),
                totalTimeMs: existing.totalTimeMs + dto.timeSpentMs,
            });
        }
        else {
            await this.resultRepo.save(this.resultRepo.create({
                questId: dto.questId,
                userId,
                score: xpEarned,
                correctAnswers: isCorrect ? 1 : 0,
                totalTimeMs: dto.timeSpentMs,
            }));
        }
        return {
            isCorrect,
            correctIndex: question.correctIndex,
            explanation: question.explanation,
            xpEarned,
        };
    }
    async completeQuest(questId) {
        const quest = await this.findById(questId);
        if (quest.status !== 'active') {
            throw new common_1.BadRequestException('El quest no está activo');
        }
        const totalQuestions = quest.questions.length;
        await Promise.all(quest.results.map(async (result) => {
            const accuracy = result.correctAnswers / totalQuestions;
            const bonusXp = Math.floor(accuracy * 200);
            const totalXp = result.score + bonusXp;
            await this.resultRepo.update(result.id, { xpEarned: totalXp });
            await this.usersService.addXp(result.userId, totalXp);
            await this.usersService.updateStreak(result.userId);
        }));
        await this.questRepo.update(questId, {
            status: 'completed',
            completedAt: new Date(),
        });
        const completed = await this.findById(questId);
        this.eventEmitter.emit('quest.completed', {
            questId,
            results: completed.results,
        });
        return completed;
    }
};
exports.QuestsService = QuestsService;
exports.QuestsService = QuestsService = QuestsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(quest_entity_1.Quest)),
    __param(1, (0, typeorm_1.InjectRepository)(quiz_question_entity_1.QuizQuestion)),
    __param(2, (0, typeorm_1.InjectRepository)(quiz_option_entity_1.QuizOption)),
    __param(3, (0, typeorm_1.InjectRepository)(player_result_entity_1.PlayerResult)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        ai_service_1.AiService,
        parties_service_1.PartiesService,
        users_service_1.UsersService,
        event_emitter_1.EventEmitter2])
], QuestsService);
//# sourceMappingURL=quests.service.js.map