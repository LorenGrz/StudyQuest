import { Repository, DataSource } from 'typeorm';
import { Party } from './party.entity';
import { PartyMember } from './party-member.entity';
import { ChatMessage } from './chat-message.entity';
export declare class PartiesService {
    private readonly partyRepo;
    private readonly memberRepo;
    private readonly chatRepo;
    private readonly dataSource;
    constructor(partyRepo: Repository<Party>, memberRepo: Repository<PartyMember>, chatRepo: Repository<ChatMessage>, dataSource: DataSource);
    createParty(subjectId: string, memberIds: string[], maxMembers?: number): Promise<Party | null>;
    findById(id: string): Promise<Party>;
    findByUser(userId: string): Promise<Party[]>;
    assertMember(party: Party, userId: string): void;
    setOnlineStatus(partyId: string, userId: string, isOnline: boolean): Promise<void>;
    addXpToMember(partyId: string, userId: string, xp: number): Promise<void>;
    closeParty(partyId: string): Promise<void>;
    addChatMessage(partyId: string, userId: string, text: string): Promise<ChatMessage>;
    getChatHistory(partyId: string, limit?: number): Promise<ChatMessage[]>;
}
