import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Between } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Tournament } from './tournament.entity';
import { TournamentParticipant } from './tournament-participant.entity';
import { Party } from '../parties/party.entity';
import { Quest } from '../quests/quest.entity';
import { PlayerResult } from '../quests/player-result.entity';
import { UsersService } from '../users/users.service';
import { PartiesService } from '../parties/parties.service';
import { QuestsService } from '../quests/quests.service';

@Injectable()
export class TournamentsService {
  private readonly logger = new Logger(TournamentsService.name);

  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepo: Repository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private readonly participantRepo: Repository<TournamentParticipant>,
    @InjectRepository(Party)
    private readonly partyRepo: Repository<Party>,
    private readonly usersService: UsersService,
    private readonly partiesService: PartiesService,
    private readonly questsService: QuestsService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: { title: string; questId: string; startsAt: Date; endsAt: Date },
    userId: string,
  ): Promise<Tournament> {
    // 1. Obtener la party activa del usuario
    const userParties = await this.partiesService.findByUser(userId);
    const activeParty = userParties.find((p) => p.status === 'active' || p.status === 'forming');
    if (!activeParty) {
      throw new BadRequestException('Debés pertenecer a una party activa para crear un torneo');
    }

    // 2. Verificar que la quest existe
    const quest = await this.questsService.findById(dto.questId);
    if (!quest) {
      throw new NotFoundException('Quest no encontrada');
    }

    // 3. Crear el torneo
    const tournament = this.tournamentRepo.create({
      title: dto.title,
      questId: dto.questId,
      creatorPartyId: activeParty.id,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      status: 'pending',
    });

    const savedTournament = await this.tournamentRepo.save(tournament);

    // 4. Agregar a la party creadora como primer participante
    const participant = this.participantRepo.create({
      tournamentId: savedTournament.id,
      partyId: activeParty.id,
    });
    await this.participantRepo.save(participant);

    // 5. Notificar en el chat de la party creadora
    try {
      await this.partiesService.addTextChatMessage(
        activeParty.id,
        userId,
        `🏆 ¡Torneo "${dto.title}" creado con éxito! Iniciará a las ${new Date(dto.startsAt).toLocaleTimeString()}. Recuerden participar en la pestaña de Torneos.`,
      );
    } catch (err) {
      this.logger.error(`Error enviando mensaje de chat: ${err.message}`);
    }

    return this.findById(savedTournament.id);
  }

  async findAll(): Promise<Tournament[]> {
    return this.tournamentRepo.find({
      relations: ['quest', 'participants', 'participants.party', 'participants.party.subject'],
      order: { startsAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Tournament> {
    const tournament = await this.tournamentRepo.findOne({
      where: { id },
      relations: [
        'quest',
        'participants',
        'participants.party',
        'participants.party.subject',
        'participants.party.members',
        'participants.party.members.user',
      ],
    });
    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado');
    }
    return tournament;
  }

  async join(tournamentId: string, userId: string): Promise<Tournament> {
    const tournament = await this.findById(tournamentId);
    if (tournament.status !== 'pending') {
      throw new BadRequestException('El torneo ya se inició o ha finalizado');
    }

    const userParties = await this.partiesService.findByUser(userId);
    const activeParty = userParties.find((p) => p.status === 'active' || p.status === 'forming');
    if (!activeParty) {
      throw new BadRequestException('Debés pertenecer a una party activa para unirte al torneo');
    }

    const alreadyJoined = tournament.participants.some((p) => p.partyId === activeParty.id);
    if (alreadyJoined) {
      throw new ConflictException('Tu party ya está inscripta en este torneo');
    }

    const participant = this.participantRepo.create({
      tournamentId,
      partyId: activeParty.id,
    });
    await this.participantRepo.save(participant);

    // Notificar en el chat de la party que se une
    try {
      await this.partiesService.addTextChatMessage(
        activeParty.id,
        userId,
        `🏆 ¡Nuestra party se ha unido al torneo "${tournament.title}"! Empieza pronto.`,
      );
    } catch (err) {
      this.logger.error(`Error enviando mensaje de chat: ${err.message}`);
    }

    return this.findById(tournamentId);
  }

  async getScoreboard(tournamentId: string) {
    const participants = await this.participantRepo.find({
      where: { tournamentId },
      relations: ['party', 'party.subject'],
      order: { score: 'DESC' },
    });

    return participants.map((p, idx) => ({
      rank: idx + 1,
      partyId: p.partyId,
      partyName: p.party.subject
        ? `${p.party.subject.code} (Grupo ${p.partyId.slice(0, 4)})`
        : `Grupo ${p.partyId.slice(0, 4)}`,
      score: p.score,
    }));
  }

  @OnEvent('quest.score_updated')
  async handleQuestScoreUpdated(payload: {
    questId: string;
    userId: string;
    score: number;
  }) {
    // Buscar torneo activo asociado a la quest
    const tournament = await this.tournamentRepo.findOne({
      where: { questId: payload.questId, status: 'active' },
    });
    if (!tournament) return;

    // Buscar a qué party pertenece el usuario que está participando en el torneo
    const participants = await this.participantRepo.find({
      where: { tournamentId: tournament.id },
      relations: ['party', 'party.members'],
    });

    const activeParticipant = participants.find((p) =>
      p.party.members.some((m) => m.userId === payload.userId),
    );

    if (!activeParticipant) return;

    // Recalcular puntaje acumulado de la party
    // El puntaje de la party es la suma de los mejores puntajes de cada miembro durante el tiempo del torneo
    const memberIds = activeParticipant.party.members.map((m) => m.userId);
    const results = await this.dataSource.getRepository(PlayerResult).find({
      where: {
        questId: tournament.questId,
        userId: In(memberIds),
        createdAt: Between(tournament.startsAt, tournament.endsAt),
      },
    });

    const userBestScores = new Map<string, number>();
    for (const res of results) {
      const currentBest = userBestScores.get(res.userId) ?? 0;
      if (res.score > currentBest) {
        userBestScores.set(res.userId, res.score);
      }
    }

    let partyScore = 0;
    for (const score of userBestScores.values()) {
      partyScore += score;
    }

    // Actualizar score cacheado de la party
    await this.participantRepo.update(activeParticipant.id, {
      score: partyScore,
    });

    // Enviar actualización de scoreboard por WebSockets
    const scoreboard = await this.getScoreboard(tournament.id);
    this.eventEmitter.emit('tournament.score_update', {
      tournamentId: tournament.id,
      scoreboard,
    });
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleTournamentSchedules() {
    const now = new Date();

    // 1. Iniciar torneos pendientes que llegaron a la fecha de inicio
    const pendingTournaments = await this.tournamentRepo.find({
      where: { status: 'pending' },
      relations: ['participants', 'participants.party'],
    });

    for (const tournament of pendingTournaments) {
      if (new Date(tournament.startsAt) <= now) {
        await this.tournamentRepo.update(tournament.id, { status: 'active' });
        this.eventEmitter.emit('tournament.started', {
          tournamentId: tournament.id,
          title: tournament.title,
          questId: tournament.questId,
        });

        // Notificar en el chat de todas las parties participantes
        for (const part of tournament.participants) {
          try {
            await this.partiesService.logActivity(
              part.partyId,
              'party_status_changed' as any, // Log activity generic
              undefined,
              `¡El torneo "${tournament.title}" ha comenzado! Tienen hasta las ${new Date(tournament.endsAt).toLocaleTimeString()} para resolver la quest.`,
            );
          } catch (err) {
            this.logger.error(`Error enviando notificación de torneo iniciado: ${err.message}`);
          }
        }
      }
    }

    // 2. Finalizar torneos activos que llegaron a la fecha de fin
    const activeTournaments = await this.tournamentRepo.find({
      where: { status: 'active' },
      relations: ['participants', 'participants.party', 'participants.party.members'],
    });

    for (const tournament of activeTournaments) {
      if (new Date(tournament.endsAt) <= now) {
        await this.tournamentRepo.update(tournament.id, { status: 'finished' });

        // Obtener ranking final
        const scoreboard = await this.getScoreboard(tournament.id);

        // Repartir recompensas a cada party según su ranking
        for (let i = 0; i < scoreboard.length; i++) {
          const entry = scoreboard[i];
          const rank = i + 1;

          // Recompensas por ranking:
          // 1er lugar: 500 XP / 100 Coins
          // 2do lugar: 300 XP / 50 Coins
          // 3er lugar: 150 XP / 25 Coins
          // Participación: 50 XP / 10 Coins
          let xpAward = 50;
          let coinsAward = 10;

          if (rank === 1) {
            xpAward = 500;
            coinsAward = 100;
          } else if (rank === 2) {
            xpAward = 300;
            coinsAward = 50;
          } else if (rank === 3) {
            xpAward = 150;
            coinsAward = 25;
          }

          const participant = tournament.participants.find((p) => p.partyId === entry.partyId);
          if (participant?.party?.members) {
            for (const member of participant.party.members) {
              try {
                await this.usersService.addXp(member.userId, xpAward);
                await this.usersService.addCoins(member.userId, coinsAward);
              } catch (err) {
                this.logger.error(`Error otorgando recompensa a usuario ${member.userId}: ${err.message}`);
              }
            }
          }

          // Registrar notificación en el chat de la party
          try {
            await this.partiesService.addTextChatMessage(
              entry.partyId,
              'SYSTEM' as any, // Notificación de sistema
              `🏆 El torneo "${tournament.title}" ha finalizado. ¡Nuestra party quedó en el puesto #${rank} con ${entry.score} puntos! Recompensas obtenidas: +${xpAward} XP y +${coinsAward} monedas por miembro.`,
            );
          } catch (err) {
            this.logger.error(`Error enviando notificación de torneo finalizado: ${err.message}`);
          }
        }

        this.eventEmitter.emit('tournament.ended', {
          tournamentId: tournament.id,
          ranking: scoreboard,
        });
      }
    }
  }
}

