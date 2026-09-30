import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Subject } from './subject.entity';
import { CreateSubjectDto, SubjectQueryDto } from '../../common/dto';
import { UniversitiesService } from '../universities/universities.service';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    private readonly universitiesService: UniversitiesService,
  ) {}

  async findAll(query: SubjectQueryDto) {
    const {
      search,
      university,
      universityId,
      career,
      year,
      page = 1,
      limit = 20,
    } = query;

    // Filter by catalog id; a legacy `university` name (old frontend) is
    // resolved to it, so "Universidad Tecnológica Nacional" and "… – FRBA"
    // are the same university. An unknown name matches nothing.
    const scopeId =
      universityId ??
      (university
        ? await this.universitiesService.resolveUniversityId(university)
        : undefined);
    if (scopeId === null)
      return { items: [], total: 0, page, limit, totalPages: 0 };

    const qb = this.subjectRepo
      .createQueryBuilder('s')
      .where('s.is_active = true')
      // Hidden legacy, merged duplicates and private community subjects
      // are not part of the public catalog.
      .andWhere(`s.status = 'active'`)
      .andWhere(`s.visibility = 'university'`);

    if (search) {
      qb.andWhere(
        `(similarity(s.name, :search) > 0.2
        OR similarity(s.code, :search) > 0.3
        OR s.name ILIKE :likeSearch
        OR s.code ILIKE :likeSearch)`,
        { search, likeSearch: `%${search}%` },
      ).orderBy('similarity(s.name, :search)', 'DESC');
    } else {
      qb.orderBy('s.enrolled_count', 'DESC');
    }

    if (scopeId)
      qb.andWhere('s.university_id = :universityId', { universityId: scopeId });
    // `career` viene de GET /subjects/careers → match exacto.
    if (career) qb.andWhere('s.career = :career', { career });
    if (year) qb.andWhere('s.year = :year', { year });

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Subject> {
    const subject = await this.subjectRepo.findOneBy({ id });
    if (!subject) throw new NotFoundException('Materia no encontrada');
    return subject;
  }

  /**
   * Admin-only curated create (users get POST /subjects/community in R2):
   * official + public; university/career must exist in the catalog.
   */
  async create(dto: CreateSubjectDto): Promise<Subject> {
    const university = await this.universitiesService.getUniversity({
      name: dto.university,
    });
    const resolved = await this.universitiesService.resolveCareer(
      university.id,
      { career: dto.career },
    );
    const career = resolved.kind === 'career' ? resolved.career : null;
    try {
      const saved = await this.subjectRepo.save(
        this.subjectRepo.create({
          ...dto,
          source: 'official',
          visibility: 'university',
          university: university.name,
          universityId: university.id,
          career: career?.name ?? dto.career,
          careerId: career?.id ?? null,
        }),
      );
      // save() hands back every column, including select:false moderation.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { moderation, ...publicFields } = saved;
      return publicFields as Subject;
    } catch (err) {
      // 23505: same code, or same normalized name in that university.
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string } | undefined)?.code === '23505'
      )
        throw new ConflictException('Esa materia ya existe en la universidad');
      throw err;
    }
  }

  /** Kept for the legacy frontend: names from the universities catalog. */
  async getUniversities(search?: string): Promise<string[]> {
    const universities =
      await this.universitiesService.listUniversities(search);
    return universities.map((u) => u.name);
  }

  /**
   * @deprecated use GET /universities/:id/careers. Active career names from
   * the catalog, optionally of one university (by name).
   */
  getCareers(university?: string): Promise<string[]> {
    return this.universitiesService.listCareerNames(university);
  }
}
