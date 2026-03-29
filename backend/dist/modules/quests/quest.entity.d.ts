import { Party } from '../parties/party.entity';
import { Subject } from '../subjects/subject.entity';
import { User } from '../users/user.entity';
import { QuizQuestion } from './quiz-question.entity';
import { PlayerResult } from './player-result.entity';
export type QuestStatus = 'generating' | 'ready' | 'active' | 'completed' | 'failed';
export declare class Quest {
    id: string;
    title: string;
    partyId: string;
    subjectId: string;
    createdBy: string;
    party: Party;
    subject: Subject;
    creator: User;
    status: QuestStatus;
    sourceText: string | null;
    sourcePdfUrl: string | null;
    errorMessage: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    questions: QuizQuestion[];
    results: PlayerResult[];
    createdAt: Date;
    updatedAt: Date;
}
