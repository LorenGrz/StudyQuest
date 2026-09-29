import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { University } from './university.entity';
import { Career } from './career.entity';
import { CareerRequest } from './career-request.entity';
import { User } from '../users/user.entity';
import { normalizeSubjectName } from '../../common/subject-name';

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
  ) {}

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

  /** By id, or by (deprecated) name matched with normalizeSubjectName. */
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
   * it. Reuses the user's pending request for the same (university, name).
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
      where: { userId, universityId, status: 'pending' },
    });
    const request =
      pending.find((r) => normalizeSubjectName(r.name) === key) ??
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
    const key = normalizeSubjectName(name);
    if (!key) return null;
    const all = await this.universityRepo.find({ order: { name: 'ASC' } });
    return all.find((u) => normalizeSubjectName(u.name) === key) ?? null;
  }
}
