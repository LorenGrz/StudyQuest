import { QuestsService } from './quests.service';
import { CreateQuestDto, SubmitAnswerDto } from '../../common/dto';
export declare class QuestsController {
    private readonly questsService;
    constructor(questsService: QuestsService);
    create(req: any, dto: CreateQuestDto, file?: Express.Multer.File): Promise<import("./quest.entity").Quest>;
    findByParty(partyId: string): Promise<import("./quest.entity").Quest[]>;
    getForPlay(id: string): Promise<any>;
    start(id: string): Promise<import("./quest.entity").Quest>;
    submitAnswer(dto: SubmitAnswerDto, req: any): Promise<{
        isCorrect: boolean;
        correctIndex: number;
        explanation: string;
        xpEarned: number;
    }>;
    complete(id: string): Promise<import("./quest.entity").Quest>;
}
