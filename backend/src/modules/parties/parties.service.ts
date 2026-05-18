import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuid } from 'uuid';
import { Party } from './party.entity';
import { PartyMember } from './party-member.entity';
import { ChatMessage } from './chat-message.entity';
import { PartyInvitation } from './party-invitation.entity';
import { PartyActivity, ActivityType } from './party-activity.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { ChatAttachmentPayload } from './chat-message.types';
import { presentChatMessage } from './chat-message.presenter';

@Injectable()
export class PartiesService {
  constructor(
    @InjectRepository(Party)
    private readonly partyRepo: Repository<Party>,
    @InjectRepository(PartyMember)
    private readonly memberRepo: Repository<PartyMember>,
    @InjectRepository(ChatMessage)
    private readonly chatRepo: Repository<ChatMessage>,
    @InjectRepository(PartyActivity)
    private readonly activityRepo: Repository<PartyActivity>,
    @InjectRepository(PartyInvitation)
    private readonly invitationRepo: Repository<PartyInvitation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly usersService: UsersService,
  ) {}

  // ─── Invite Link (≥PostgreSQL, sin Redis) ────────────────────────────────────

  /** Genera token de invitación válido 24hs y lo persiste en la party */
  async generateInviteToken(partyId: string, requestingUserId: string): Promise<string> {
    const isMember = await this.memberRepo.findOne({
      where: { partyId, userId: requestingUserId },
    });
    if (!isMember) throw new ForbiddenException('No sos miembro de esta party');

    // Reusar el token si todavía es válido
    const existing = await this.partyRepo.findOne({ where: { id: partyId } });
    if (existing?.inviteToken && existing.inviteExpiresAt && existing.inviteExpiresAt > new Date()) {
      return existing.inviteToken;
    }

    const token = uuid().replace(/-/g, '').slice(0, 16);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.partyRepo.update(partyId, { inviteToken: token, inviteExpiresAt: expiresAt });
    return token;
  }

  /** Valida el token y une al usuario a la party */
  async joinByInviteToken(token: string, userId: string): Promise<Party> {
    const party = await this.partyRepo.findOne({
      where: {
        inviteToken: token,
        inviteExpiresAt: MoreThan(new Date()),
      },
    });
    if (!party) throw new NotFoundException('El enlace de invitación es inválido o expiró');

    return this.joinParty(party.id, userId);
  }

  async inviteFriendToParty(
    partyId: string,
    inviterId: string,
    inviteeId: string,
  ): Promise<PartyInvitation> {
    if (inviterId === inviteeId) {
      throw new BadRequestException('No podés invitarte a vos mismo');
    }

    const party = await this.partyRepo.findOne({
      where: { id: partyId },
      relations: ['members'],
    });
    if (!party) throw new NotFoundException('Party no encontrada');

    const inviterMember = party.members?.find((m) => m.userId === inviterId);
    if (!inviterMember) {
      throw new ForbiddenException('Solo los miembros pueden invitar a amigos');
    }

    if (party.members.some((m) => m.userId === inviteeId)) {
      throw new BadRequestException('El usuario ya forma parte de la party');
    }

    const areFriends = await this.usersService.areFriends(inviterId, inviteeId);
    if (!areFriends) {
      throw new BadRequestException('Solo podés invitar amigos directos');
    }

    const existing = await this.invitationRepo.findOne({
      where: { partyId, inviteeId },
    });
    if (existing?.status === 'pending') return existing;
    if (existing?.status === 'accepted') {
      throw new ConflictException('La invitación ya fue aceptada');
    }

    const invitation = this.invitationRepo.create({
      partyId,
      inviterId,
      inviteeId,
      status: 'pending',
    });
    return this.invitationRepo.save(invitation);
  }

  async getPartyInvitations(userId: string): Promise<PartyInvitation[]> {
    return this.invitationRepo.find({
      where: { inviteeId: userId, status: 'pending' },
      relations: ['party', 'inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  async acceptPartyInvitation(invitationId: string, userId: string): Promise<Party> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId },
      relations: ['party'],
    });
    if (!invitation) throw new NotFoundException('Invitación no encontrada');
    if (invitation.inviteeId !== userId) {
      throw new ForbiddenException('No podés aceptar esta invitación');
    }
    if (invitation.status !== 'pending') {
      throw new BadRequestException('La invitación ya fue respondida');
    }

    const joinedParty = await this.joinParty(invitation.partyId, userId);
    await this.invitationRepo.update(invitationId, {
      status: 'accepted',
      respondedAt: new Date(),
    });
    await this.logActivity(
      invitation.partyId,
      'member_joined',
      userId,
      'Aceptó invitación directa a la party',
      { inviterId: invitation.inviterId },
    );

    return joinedParty;
  }

  async rejectPartyInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId },
    });
    if (!invitation) throw new NotFoundException('Invitación no encontrada');
    if (invitation.inviteeId !== userId) {
      throw new ForbiddenException('No podés rechazar esta invitación');
    }
    if (invitation.status !== 'pending') {
      throw new BadRequestException('La invitación ya fue respondida');
    }

    await this.invitationRepo.update(invitationId, {
      status: 'rejected',
      respondedAt: new Date(),
    });
  }

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

  async createForUser(
    userId: string,
    subjectId?: string,
    maxMembers = 4,
    isPrivate = false,
  ): Promise<Party> {
    // Si no se pasa subjectId, usamos la primera materia inscripta del usuario
    let resolvedSubjectId = subjectId;
    if (!resolvedSubjectId) {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['enrolledSubjects'],
      });
      if (!user?.enrolledSubjects?.length) {
        throw new BadRequestException(
          'Necesitás tener al menos una materia inscripta para crear una party',
        );
      }
      resolvedSubjectId = user.enrolledSubjects[0].id;
    }

    return this.dataSource.transaction(async (em) => {
      const party = em.create(Party, {
        subjectId: resolvedSubjectId,
        maxMembers,
        isPrivate,
        status: 'forming',
      });
      await em.save(party);

      const leader = em.create(PartyMember, {
        partyId: party.id,
        userId,
        isOnline: true,
        role: 'leader',
      });
      await em.save(leader);

      const result = await em.findOne(Party, {
        where: { id: party.id },
        relations: ['subject', 'members', 'members.user'],
      });
      if (!result) throw new NotFoundException('Error al crear la party');

      // Log que se creó la party después de la transacción
      await this.logActivity(
        party.id,
        'member_joined',
        userId,
        'Creó la party (como líder)',
      );

      return result;
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
    await this.logActivity(
      partyId,
      'party_status_changed',
      undefined,
      'Party cerrada',
      { oldStatus: 'active', newStatus: 'closed' },
    );
  }

  /** Cierra la party — solo el líder puede hacerlo */
  async closePartyAsHost(partyId: string, requesterId: string): Promise<void> {
    const leader = await this.memberRepo.findOne({
      where: { partyId, userId: requesterId, role: 'leader' },
    });
    if (!leader) throw new ForbiddenException('Solo el líder puede cerrar la party');
    await this.closeParty(partyId);
  }

  /**
   * Remueve a un miembro de la party.
   * Reglas:
   *  - El solicitante debe ser líder.
   *  - El líder no puede removerse a sí mismo (debe usar leaveParty o closePartyAsHost).
   */
  async removeMember(
    partyId: string,
    requesterId: string,
    targetUserId: string,
  ): Promise<void> {
    const requester = await this.memberRepo.findOne({
      where: { partyId, userId: requesterId },
    });
    if (!requester || requester.role !== 'leader')
      throw new ForbiddenException('Solo el líder puede remover miembros');
    if (requesterId === targetUserId)
      throw new BadRequestException(
        'No podés removerte a vos mismo. Usá "Salir de la party" o "Cerrar party".',
      );
    const target = await this.memberRepo.findOne({
      where: { partyId, userId: targetUserId },
    });
    if (!target) throw new NotFoundException('El miembro no pertenece a esta party');
    await this.memberRepo.remove(target);

    await this.logActivity(
      partyId,
      'member_removed',
      requesterId,
      `Removió a un miembro`,
      { targetUserId },
    );
  }

  /**
   * Sale de la party.
   * Reglas:
   *  - Si es member → solo se elimina su registro.
   *  - Si es leader y hay otros miembros → promueve al miembro con joinedAt más antiguo.
   *  - Si es leader y está solo → cierra la party.
   */
  async leaveParty(partyId: string, userId: string): Promise<void> {
    return this.dataSource.transaction(async (em) => {
      const memberRecord = await em.findOne(PartyMember, {
        where: { partyId, userId },
      });
      if (!memberRecord) throw new NotFoundException('No sos miembro de esta party');

      if (memberRecord.role !== 'leader') {
        await em.remove(memberRecord);
        await this.logActivity(
          partyId,
          'member_left',
          userId,
          'Salió de la party',
        );
        return;
      }

      // Es el líder — buscar otros miembros
      const others = await em.find(PartyMember, {
        where: { partyId },
        order: { joinedAt: 'ASC' },
      });
      const rest = others.filter((m) => m.userId !== userId);

      if (rest.length === 0) {
        // Estaba solo → cerrar party
        await em.remove(memberRecord);
        await em.update(Party, partyId, { status: 'closed', closedAt: new Date() });
        await this.logActivity(
          partyId,
          'party_status_changed',
          userId,
          'Party cerrada (líder se fue y no había otros miembros)',
          { oldStatus: 'active', newStatus: 'closed' },
        );
        return;
      }

      // Promover al miembro más antiguo y eliminar al líder saliente
      const newLeader = rest[0];
      await em.update(PartyMember, { id: newLeader.id }, { role: 'leader' });
      await em.remove(memberRecord);

      await this.logActivity(
        partyId,
        'member_left',
        userId,
        'Salió de la party (era líder)',
      );
      await this.logActivity(
        partyId,
        'member_promoted',
        newLeader.userId,
        `Fue promovido a líder`,
      );
    });
  }

  async updateVisibility(partyId: string, userId: string, isPrivate: boolean): Promise<void> {
    const leader = await this.memberRepo.findOne({
      where: { partyId, userId, role: 'leader' },
    });
    if (!leader) throw new ForbiddenException('Solo el líder puede cambiar la visibilidad de la party');

    const currentParty = await this.partyRepo.findOne({ where: { id: partyId } });
    const oldVisibility = currentParty?.isPrivate ?? false;

    await this.partyRepo.update(partyId, { isPrivate });

    if (oldVisibility !== isPrivate) {
      await this.logActivity(
        partyId,
        'party_visibility_changed',
        userId,
        `Cambió la visibilidad de la party a ${isPrivate ? 'privada' : 'pública'}`,
        { oldVisibility, newVisibility: isPrivate },
      );
    }
  }

  async addTextChatMessage(
    partyId: string,
    userId: string,
    text: string,
  ) {
    const msg = this.chatRepo.create({
      partyId,
      userId,
      type: 'text',
      text: text.trim(),
      attachmentUrl: null,
      attachmentName: null,
      attachmentMimeType: null,
      attachmentSizeBytes: null,
      attachmentDurationMs: null,
    });
    const saved = await this.chatRepo.save(msg);
    const full = await this.chatRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
    return presentChatMessage(full as ChatMessage);
  }

  async addBinaryChatMessage(
    partyId: string,
    userId: string,
    attachment: ChatAttachmentPayload & { type: 'file' | 'audio' },
  ) {
    const msg = this.chatRepo.create({
      partyId,
      userId,
      type: attachment.type,
      text: null,
      attachmentUrl: attachment.url,
      attachmentName: attachment.name,
      attachmentMimeType: attachment.mimeType,
      attachmentSizeBytes: attachment.sizeBytes,
      attachmentDurationMs: attachment.durationMs ?? null,
    });
    const saved = await this.chatRepo.save(msg);
    const full = await this.chatRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
    const response = presentChatMessage(full as ChatMessage);
    this.eventEmitter.emit('party.chat_message', { partyId, message: response });
    return response;
  }

  async addChatMessage(
    partyId: string,
    userId: string,
    text: string,
  ) {
    return this.addTextChatMessage(partyId, userId, text);
  }

  async getChatHistory(partyId: string, limit = 100) {
    const msgs = await this.chatRepo.find({
      where: { partyId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return msgs.reverse().map(presentChatMessage);
  }

  // ─── Activity Logging ──────────────────────────────────────────────────────────

  /**
   * Registra una actividad en la party (miembro se unió, quest completado, etc)
   */
  async logActivity(
    partyId: string,
    type: ActivityType,
    userId?: string,
    description?: string,
    metadata?: any,
  ): Promise<PartyActivity> {
    const activity = this.activityRepo.create({
      partyId,
      type,
      userId,
      description,
      metadata,
    });
    const saved = await this.activityRepo.save(activity);

    // Emitir evento para que el gateway lo transmita via WebSocket
    this.eventEmitter.emit('party.activity', {
      partyId,
      activity: saved,
    });

    return saved;
  }

  /**
   * Obtiene el historial de actividades de una party
   */
  async getActivityHistory(partyId: string, limit = 50): Promise<PartyActivity[]> {
    return this.activityRepo.find({
      where: { partyId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
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
      .andWhere('p.is_private = false')
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
      // Obtenemos la party con exclusividad (lock) pero SIN JOINs para no romper FOR UPDATE
      const party = await em.findOne(Party, {
        where: { id: partyId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!party) throw new NotFoundException('Party no encontrada');

      // Ahora obtenemos los miembros
      const members = await em.find(PartyMember, {
        where: { partyId },
      });
      party.members = members;
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

      let statusChanged = false;
      // Si la party se llenó, pasarla a active
      if (party.members.length + 1 >= party.maxMembers) {
        await em.update(Party, partyId, { status: 'active' });
        statusChanged = true;
      }

      const updated = await em.findOne(Party, {
        where: { id: partyId },
        relations: ['subject', 'members', 'members.user', 'quests'],
      });
      if (!updated) throw new NotFoundException('Party no encontrada tras unirse');

      // Log activity después de la transacción
      await this.logActivity(
        partyId,
        'member_joined',
        userId,
        `Se unió a la party`,
      );

      if (statusChanged) {
        await this.logActivity(
          partyId,
          'party_status_changed',
          undefined,
          'Party se llenó y pasó a activa',
          { oldStatus: 'forming', newStatus: 'active' },
        );
      }

      return updated;
    });
  }
}
