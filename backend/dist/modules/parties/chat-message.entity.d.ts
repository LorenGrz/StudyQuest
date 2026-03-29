import { Party } from './party.entity';
import { User } from '../users/user.entity';
export declare class ChatMessage {
    id: string;
    partyId: string;
    userId: string;
    party: Party;
    user: User;
    text: string;
    createdAt: Date;
}
