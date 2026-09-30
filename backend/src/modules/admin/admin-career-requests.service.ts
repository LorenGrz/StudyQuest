import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { normalizeSubjectName } from '../../common/subject-name';
import {
  CareerRequest,
  CareerRequestStatus,
} from '../universities/career-request.entity';
import { Career, CareerLevel } from '../universities/career.entity';
import { User } from '../users/user.entity';

export interface AdminCareerRequestDto {
  id: string;
  name: string;
  status: CareerRequestStatus;
  universityId: string;
  universityName: string | null;
  userId: string;
  username: string | null;
  displayName: string | null;
  careerId: string | null;
  adminNote: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

/** `{ careerId }` links an existing career; `{ name, faculty?, level? }` creates one. */
export interface ApproveCareerRequestChoice {
  careerId?: string;
  name?: string;
  faculty?: string | null;
  level?: CareerLevel;
}

const toDto = (r: CareerRequest): AdminCareerRequestDto => ({
  id: r.id,
  name: r.name,
  status: r.status,
  universityId: r.universityId,
  universityName: r.university?.name ?? null,
  userId: r.userId,
  username: r.user?.username ?? null,
  displayName: r.user?.displayName ?? null,
  careerId: r.careerId,
  adminNote: r.adminNote,
  createdAt: r.createdAt,
  resolvedAt: r.resolvedAt,
});

/**
 * Admin panel (W3), "Pedidos de carrera": approve (link or create the
 * career and assign it to every matching pending request) or reject with a
 * note. Both run in one transaction.
 */
@Injectable()
export class AdminCareerRequestsService {
  constructor(
    @InjectRepository(CareerRequest)
    private readonly requestRepo: Repository<CareerRequest>,
    private readonly dataSource: DataSource,
  ) {}

  async list(status?: CareerRequestStatus): Promise<AdminCareerRequestDto[]> {
    const rows = await this.requestRepo.find({
      where: { status: status ?? 'pending' },
      relations: ['user', 'university'],
      order: { createdAt: 'ASC' },
    });
    return rows.map(toDto);
  }

  /**
   * Links or creates the career, then assigns it to every pending request of
   * the same university whose normalized name matches this one (the
   * requester included): sets `career_id`/`career` on their user and clears
   * `pending_career_request_id` only where it still points at one of these
   * requests (a different, still-unresolved request keeps its pointer).
   */
  async approve(
    requestId: string,
    choice: ApproveCareerRequestChoice,
  ): Promise<{ career: Career; approvedRequests: number }> {
    const given = [choice.careerId, choice.name].filter((v) => v !== undefined);
    if (given.length > 1)
      throw new BadRequestException(
        'Elegí una carrera existente o creá una nueva, no las dos',
      );

    return this.dataSource.transaction(async (em) => {
      const requestRepo = em.getRepository(CareerRequest);
      const careerRepo = em.getRepository(Career);

      const request = await requestRepo.findOne({ where: { id: requestId } });
      if (!request) throw new NotFoundException('Pedido no encontrado');
      if (request.status !== 'pending')
        throw new ConflictException('Ese pedido ya fue resuelto');

      let career: Career;
      if (choice.careerId) {
        const found = await careerRepo.findOneBy({
          id: choice.careerId,
          universityId: request.universityId,
        });
        if (!found)
          throw new BadRequestException(
            'La carrera no existe o no pertenece a esa universidad',
          );
        if (found.status !== 'active') {
          found.status = 'active';
          await careerRepo.save(found);
        }
        career = found;
      } else {
        const name = (choice.name ?? request.name).trim();
        const nameNormalized = normalizeSubjectName(name);
        const existing = await careerRepo.findOneBy({
          universityId: request.universityId,
          nameNormalized,
        });
        if (existing) {
          if (existing.status !== 'active') {
            existing.status = 'active';
            await careerRepo.save(existing);
          }
          career = existing;
        } else {
          career = await careerRepo.save(
            careerRepo.create({
              universityId: request.universityId,
              name,
              faculty: choice.faculty ?? null,
              level: choice.level ?? 'grado',
              status: 'active',
              verifiedAt: new Date(),
            }),
          );
        }
      }

      const key = normalizeSubjectName(request.name);
      const pending = await requestRepo.find({
        where: { universityId: request.universityId, status: 'pending' },
      });
      const toApprove = pending.filter(
        (r) => normalizeSubjectName(r.name) === key,
      );

      const now = new Date();
      for (const r of toApprove) {
        r.status = 'approved';
        r.careerId = career.id;
        r.resolvedAt = now;
      }
      await requestRepo.save(toApprove);

      const requestIds = toApprove.map((r) => r.id);
      const userIds = toApprove.map((r) => r.userId);
      if (userIds.length)
        await em.query(
          `UPDATE users SET career_id = $1, career = $2,
             pending_career_request_id = CASE
               WHEN pending_career_request_id = ANY($3::uuid[]) THEN NULL
               ELSE pending_career_request_id
             END
           WHERE id = ANY($4::uuid[])`,
          [career.id, career.name, requestIds, userIds],
        );

      return { career, approvedRequests: toApprove.length };
    });
  }

  /** Rejects one request; leaves the user's career empty. */
  async reject(
    requestId: string,
    adminNote?: string,
  ): Promise<AdminCareerRequestDto> {
    return this.dataSource.transaction(async (em) => {
      const requestRepo = em.getRepository(CareerRequest);
      const request = await requestRepo.findOne({ where: { id: requestId } });
      if (!request) throw new NotFoundException('Pedido no encontrado');
      if (request.status !== 'pending')
        throw new ConflictException('Ese pedido ya fue resuelto');

      request.status = 'rejected';
      request.adminNote = adminNote?.trim() || null;
      request.resolvedAt = new Date();
      await requestRepo.save(request);

      await em
        .getRepository(User)
        .update(
          { id: request.userId, pendingCareerRequestId: request.id },
          { pendingCareerRequestId: null },
        );

      return toDto(request);
    });
  }
}
