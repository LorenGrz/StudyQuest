import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { University } from './university.entity';
import { Career } from './career.entity';
import { CareerRequest } from './career-request.entity';
import { User } from '../users/user.entity';
import { normalizeSubjectName } from '../../common/subject-name';
import { universityKey } from '../../common/university-name';
import { mapUsersToCatalog, MapUsersResult } from './map-users-to-catalog';

/** Max pending "Otra" requests per user (anti-spam; admins review them). */
export const MAX_PENDING_CAREER_REQUESTS = 3;

/** What the client can send to pick a career (register / profile). */
export interface CareerChoice {
  careerId?: string;
  /** Free text for "Otra (no está en la lista)". */
  careerName?: string;
  /** Deprecated: legacy frontend sends the catalog name. */
  career?: string;
}

export type ResolvedCareer =
  | { kind: 'career'; career: Career }
  | { kind: 'request'; name: string };

export interface UniversitySummary {
  id: string;
  name: string;
  shortName: string | null;
  website: string | null;
}

export interface CareerSummary {
  id: string;
  universityId: string;
  name: string;
  faculty: string | null;
  level: string;
}

const toUniversitySummary = (u: University): UniversitySummary => ({
  id: u.id,
  name: u.name,
  shortName: u.shortName,
  website: u.website,
});

const toCareerSummary = (c: Career): CareerSummary => ({
  id: c.id,
  universityId: c.universityId,
  name: c.name,
  faculty: c.faculty,
  level: c.level,
});

/**
 * Official universities/careers catalog and "Otra" career requests. Replaces
 * the closed CAREERS constant: register/profile validate against the DB.
 */
@Injectable()
export class UniversitiesService {
  constructor(
    @InjectRepository(University)
    private readonly universityRepo: Repository<University>,
    @InjectRepository(Career)
    private readonly careerRepo: Repository<Career>,
    @InjectRepository(CareerRequest)
    private readonly careerRequestRepo: Repository<CareerRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Legacy `university` name (query params, old frontend) → catalog id, with
   * the UTN alias. `null` when it matches no catalog university.
   */
  async resolveUniversityId(name: string): Promise<string | null> {
    return (await this.findUniversityByName(name))?.id ?? null;
  }

  /** See mapUsersToCatalog(); `careers:sync` calls this after inserting. */
  mapUsersToCatalog(): Promise<MapUsersResult> {
    return mapUsersToCatalog(this.dataSource);
  }

  async listUniversities(search?: string): Promise<UniversitySummary[]> {
    const qb = this.universityRepo.createQueryBuilder('u').orderBy('u.name');
    if (search)
      qb.where('u.name ILIKE :search OR u.short_name ILIKE :search', {
        search: `%${search}%`,
      });
    return (await qb.getMany()).map(toUniversitySummary);
  }

  async listCareers(universityId: string): Promise<CareerSummary[]> {
    const exists = await this.universityRepo.existsBy({ id: universityId });
    if (!exists) throw new NotFoundException('Universidad no encontrada');
    const careers = await this.careerRepo.find({
      where: { universityId, status: 'active' },
      order: { name: 'ASC' },
    });
    return careers.map(toCareerSummary);
  }

  /** Deprecated GET /subjects/careers: active career names, optionally of one university (by name). */
  async listCareerNames(universityName?: string): Promise<string[]> {
    const qb = this.careerRepo
      .createQueryBuilder('c')
      .select('DISTINCT c.name', 'name')
      .where(`c.status = 'active'`)
      .orderBy('c.name', 'ASC');
    if (universityName) {
      const university = await this.findUniversityByName(universityName);
      if (!university) return [];
      qb.andWhere('c.university_id = :universityId', {
        universityId: university.id,
      });
    }
    const rows = await qb.getRawMany<{ name: string }>();
    return rows.map((r) => r.name);
  }

  /** By id, or by (deprecated) name matched with universityKey (UTN alias). */
  async getUniversity(ref: {
    universityId?: string;
    name?: string;
  }): Promise<University> {
    const university = ref.universityId
      ? await this.universityRepo.findOneBy({ id: ref.universityId })
      : ref.name
        ? await this.findUniversityByName(ref.name)
        : null;
    if (!university) throw new BadRequestException('Universidad inválida');
    return university;
  }

  /**
   * The career must exist, be active and belong to `universityId`. A
   * `careerName` ("Otra") that matches an active career resolves to it;
   * otherwise it becomes a career request.
   */
  async resolveCareer(
    universityId: string,
    choice: CareerChoice,
  ): Promise<ResolvedCareer> {
    const given = [choice.careerId, choice.careerName].filter(
      (v) => v !== undefined,
    );
    if (given.length > 1)
      throw new BadRequestException(
        'Elegí una carrera de la lista o escribí otra, no las dos',
      );

    if (choice.careerId) {
      const career = await this.careerRepo.findOneBy({
        id: choice.careerId,
        universityId,
        status: 'active',
      });
      if (!career)
        throw new BadRequestException(
          'La carrera no existe o no pertenece a esa universidad',
        );
      return { kind: 'career', career };
    }

    const name = (choice.careerName ?? choice.career ?? '').trim();
    const nameNormalized = normalizeSubjectName(name);
    if (!nameNormalized) throw new BadRequestException('Elegí una carrera');
    const career = await this.careerRepo.findOneBy({
      universityId,
      nameNormalized,
      status: 'active',
    });
    if (career) return { kind: 'career', career };
    if (choice.careerName !== undefined)
      return { kind: 'request', name: name.replace(/\s+/g, ' ') };
    throw new BadRequestException(
      'La carrera no existe o no pertenece a esa universidad',
    );
  }

  /**
   * Records a pending request and points `users.pending_career_request_id` at
   * it. Reuses the user's pending request for the same (university, name);
   * 409 when the user already has MAX_PENDING_CAREER_REQUESTS pending.
   */
  async createCareerRequest(
    userId: string,
    universityId: string,
    name: string,
    em?: EntityManager,
  ): Promise<CareerRequest> {
    const repo = em ? em.getRepository(CareerRequest) : this.careerRequestRepo;
    const userRepo = em ? em.getRepository(User) : this.userRepo;
    const cleanName = name.trim().replace(/\s+/g, ' ');
    const key = normalizeSubjectName(cleanName);

    const pending = await repo.find({
      where: { userId, status: 'pending' },
    });
    const existing = pending.find(
      (r) =>
        r.universityId === universityId && normalizeSubjectName(r.name) === key,
    );
    if (!existing && pending.length >= MAX_PENDING_CAREER_REQUESTS)
      throw new ConflictException(
        `Ya tenés ${MAX_PENDING_CAREER_REQUESTS} carreras pendientes de aprobación. Esperá a que las revisemos antes de pedir otra.`,
      );
    const request =
      existing ??
      (await repo.save(
        repo.create({
          userId,
          universityId,
          name: cleanName,
          status: 'pending',
        }),
      ));
    await userRepo.update(userId, { pendingCareerRequestId: request.id });
    return request;
  }

  /** POST /career-requests (JWT): 409 with the career if it already exists. */
  async requestCareer(
    userId: string,
    universityId: string,
    name: string,
  ): Promise<CareerRequest> {
    const university = await this.getUniversity({ universityId });
    const resolved = await this.resolveCareer(university.id, {
      careerName: name,
    });
    if (resolved.kind === 'career')
      throw new ConflictException({
        statusCode: 409,
        message: 'Esa carrera ya está en la lista',
        career: toCareerSummary(resolved.career),
      });
    return this.createCareerRequest(userId, university.id, resolved.name);
  }

  findMyCareerRequests(userId: string): Promise<CareerRequest[]> {
    return this.careerRequestRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  private async findUniversityByName(name: string): Promise<University | null> {
    const exact = await this.universityRepo.findOneBy({ name });
    if (exact) return exact;
    const key = universityKey(name);
    if (!key) return null;
    const all = await this.universityRepo.find({ order: { name: 'ASC' } });
    // Same rule as mapUsersToCatalog: full name first, then the acronym, so a
    // legacy "UNSAM" resolves like the deploy-time mapping does.
    return (
      all.find((u) => universityKey(u.name) === key) ??
      all.find((u) => u.shortName && universityKey(u.shortName) === key) ??
      null
    );
  }
}
