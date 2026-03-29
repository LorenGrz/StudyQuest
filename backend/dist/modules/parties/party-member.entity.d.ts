import { Party } from './party.entity';
import { User } from '../users/user.entity';
export declare class PartyMember {
    id: string;
    partyId: string;
    userId: string;
    party: Party;
    user: User;
    partyXp: number;
    isOnline: boolean;
    joinedAt: Date;
}
