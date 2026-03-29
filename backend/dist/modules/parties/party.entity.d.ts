import { Subject } from '../subjects/subject.entity';
import { PartyMember } from './party-member.entity';
import { ChatMessage } from './chat-message.entity';
import { Quest } from '../quests/quest.entity';
export type PartyStatus = 'forming' | 'active' | 'closed';
export declare class Party {
    id: string;
    subjectId: string;
    subject: Subject;
    status: PartyStatus;
    maxMembers: number;
    members: PartyMember[];
    chatMessages: ChatMessage[];
    quests: Quest[];
    closedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
