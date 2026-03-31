import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Party } from './party.entity';
import { PartyMember } from './party-member.entity';
import { ChatMessage } from './chat-message.entity';

@Injectable()
export class PartiesService {
  constructor(
    @InjectRepository(Party)
    private readonly partyRepo: Repository<Party>,
    @InjectRepository(PartyMember)
    private readonly memberRepo: Repository<PartyMember>,
    @InjectRepository(ChatMessage)
    private readonly chatRepo: Repository<ChatMessage>,
    private readonly dataSource: DataSource,
  ) {}

  async createParty(
    subjectId: string,
    memberIds: string[],
    maxMembers = 4,
  ): Promise<Party | null> {
    return this.dataSource.transaction(async (em) => {
      const party = em.create(Party, {
        subjectId,
        maxMembers,
        status: 'active',
      });
      await em.save(party);

      const members = memberIds.map((userId) =>
        em.create(PartyMember, { partyId: party.id, userId, isOnline: true }),
      );
      await em.save(members);

      return em.findOne(Party, {
        where: { id: party.id },
        relations: ['subject', 'members', 'members.user'],
      });
    });
  }

  async findById(id: string): Promise<Party> {
    const party = await this.partyRepo.findOne({
      where: { id },
      relations: ['subject', 'members', 'members.user', 'quests'],
    });
    if (!party) throw new NotFoundException('Party no encontrada');
    return party;
  }

  async findByUser(userId: string): Promise<Party[]> {
    return this.partyRepo
      .createQueryBuilder('p')
      .innerJoin('p.members', 'pm', 'pm.user_id = :userId', { userId })
      .leftJoinAndSelect('p.subject', 's')
      .leftJoinAndSelect('p.members', 'allMembers')
      .leftJoinAndSelect('allMembers.user', 'u')
      .leftJoinAndSelect('p.quests', 'q')
      .where("p.status != 'closed'")
      .orderBy('p.updated_at', 'DESC')
      .getMany();
  }

  assertMember(party: Party, userId: string): void {
    const isMember = party.members?.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('No sos miembro de esta party');
  }

  async setOnlineStatus(
    partyId: string,
    userId: string,
    isOnline: boolean,
  ): Promise<void> {
    await this.memberRepo.update({ partyId, userId }, { isOnline });
  }

  async addXpToMember(
    partyId: string,
    userId: string,
    xp: number,
  ): Promise<void> {
    await this.memberRepo
      .createQueryBuilder()
      .update()
      .set({ partyXp: () => `party_xp + ${xp}` })
      .where('party_id = :partyId AND user_id = :userId', { partyId, userId })
      .execute();
  }

  async closeParty(partyId: string): Promise<void> {
    await this.partyRepo.update(partyId, {
      status: 'closed',
      closedAt: new Date(),
    });
  }

  async addChatMessage(
    partyId: string,
    userId: string,
    text: string,
  ): Promise<ChatMessage> {
    const msg = this.chatRepo.create({ partyId, userId, text: text.trim() });
    return this.chatRepo.save(msg);
  }

  async getChatHistory(partyId: string, limit = 100): Promise<ChatMessage[]> {
    const msgs = await this.chatRepo.find({
      where: { partyId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return msgs.reverse();
  }
}
