import { User } from '../users/user.entity';
import { Party } from '../parties/party.entity';
export declare class Subject {
    id: string;
    name: string;
    code: string;
    description: string | null;
    university: string;
    career: string;
    semester: number;
    enrolledCount: number;
    isActive: boolean;
    enrolledUsers: User[];
    parties: Party[];
    createdAt: Date;
    updatedAt: Date;
}
