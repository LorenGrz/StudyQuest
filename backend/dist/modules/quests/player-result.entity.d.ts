import { Quest } from './quest.entity';
import { User } from '../users/user.entity';
export declare class PlayerResult {
    id: string;
    questId: string;
    userId: string;
    quest: Quest;
    user: User;
    score: number;
    correctAnswers: number;
    xpEarned: number;
    totalTimeMs: number;
    createdAt: Date;
}
