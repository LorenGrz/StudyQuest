import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Party } from './party.entity';
import { PartyMember } from './party-member.entity';
import { ChatMessage } from './chat-message.entity';
import { User } from '../users/user.entity';

@Injectable()
export class PartiesService {
  constructor(
    @InjectRepository(Party)
    private readonly partyRepo: Repository<Party>,
    @InjectRepository(PartyMember)
    private readonly memberRepo: Repository<PartyMember>,
    @InjectRepository(ChatMessage)
    private readonly chatRepo: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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

  /**
   * Devuelve parties abiertas (forming/active con slots libres) que compartan
   * al menos una materia con el usuario autenticado, excluyendo aquellas en las
   * que ya es miembro.
   */
  async discover(userId: string): Promise<Party[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['enrolledSubjects'],
    });
    if (!user || !user.enrolledSubjects?.length) return [];

    const subjectIds = user.enrolledSubjects.map((s) => s.id);

    // Parties en las materias del usuario donde ya es miembro
    const memberOfIds = await this.memberRepo
      .createQueryBuilder('pm')
      .select('pm.party_id', 'partyId')
      .where('pm.user_id = :userId', { userId })
      .getRawMany();
    const excludeIds = memberOfIds.map((r) => r.partyId);

    const qb = this.partyRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.subject', 'subject')
      .leftJoinAndSelect('p.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .leftJoinAndSelect('p.quests', 'quests')
      .where('p.subject_id IN (:...subjectIds)', { subjectIds })
      .andWhere("p.status IN ('forming', 'active')")
      .orderBy('p.createdAt', 'DESC')
      .take(50);

    if (excludeIds.length) {
      qb.andWhere('p.id NOT IN (:...excludeIds)', { excludeIds });
    }

    const parties = await qb.getMany();

    // Filtrar solo las que aun tienen slots libres
    return parties.filter(
      (p) => p.members.length < p.maxMembers,
    );
  }

  /**
   * Une al usuario autenticado a una party existente si hay slots disponibles.
   */
  async joinParty(partyId: string, userId: string): Promise<Party> {
    return this.dataSource.transaction(async (em) => {
      const party = await em.findOne(Party, {
        where: { id: partyId },
        relations: ['members'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!party) throw new NotFoundException('Party no encontrada');
      if (party.status === 'closed')
        throw new BadRequestException('La party ya está cerrada');

      const alreadyMember = party.members.some((m) => m.userId === userId);
      if (alreadyMember)
        throw new ConflictException('Ya sos miembro de esta party');

      if (party.members.length >= party.maxMembers)
        throw new BadRequestException('La party está llena');

      const member = em.create(PartyMember, {
        partyId,
        userId,
        isOnline: true,
      });
      await em.save(member);

      // Si la party se llenó, pasarla a active
      if (party.members.length + 1 >= party.maxMembers) {
        await em.update(Party, partyId, { status: 'active' });
      }

      const updated = await em.findOne(Party, {
        where: { id: partyId },
        relations: ['subject', 'members', 'members.user', 'quests'],
      });
      if (!updated) throw new NotFoundException('Party no encontrada tras unirse');
      return updated;
    });
  }
}
