import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Quest } from './quest.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuizOption } from './quiz-option.entity';
import { PlayerResult } from './player-result.entity';
import { AiService } from '../ai/ai.service';
import { PartiesService } from '../parties/parties.service';
import { UsersService } from '../users/users.service';
import { CreateQuestDto, SubmitAnswerDto } from '../../common/dto';
export declare class QuestsService {
    private readonly questRepo;
    private readonly questionRepo;
    private readonly optionRepo;
    private readonly resultRepo;
    private readonly dataSource;
    private readonly aiService;
    private readonly partiesService;
    private readonly usersService;
    private readonly eventEmitter;
    private readonly logger;
    constructor(questRepo: Repository<Quest>, questionRepo: Repository<QuizQuestion>, optionRepo: Repository<QuizOption>, resultRepo: Repository<PlayerResult>, dataSource: DataSource, aiService: AiService, partiesService: PartiesService, usersService: UsersService, eventEmitter: EventEmitter2);
    createQuest(dto: CreateQuestDto, userId: string, file?: Express.Multer.File): Promise<Quest>;
    private generateInBackground;
    findById(id: string): Promise<Quest>;
    findByParty(partyId: string): Promise<Quest[]>;
    getQuestForPlay(questId: string): Promise<any>;
    startQuest(questId: string): Promise<Quest>;
    submitAnswer(dto: SubmitAnswerDto, userId: string): Promise<{
        isCorrect: boolean;
        correctIndex: number;
        explanation: string;
        xpEarned: number;
    }>;
    completeQuest(questId: string): Promise<Quest>;
}
