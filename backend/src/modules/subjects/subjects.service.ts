import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './subject.entity';
import { CreateSubjectDto, SubjectQueryDto } from '../../common/dto';
import { CAREERS } from '../../common/careers';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
  ) {}

  async findAll(query: SubjectQueryDto) {
    const { search, university, career, year, page = 1, limit = 20 } = query;

    const qb = this.subjectRepo
      .createQueryBuilder('s')
      .where('s.is_active = true');

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

    if (university)
      qb.andWhere('s.university ILIKE :uni', { uni: `%${university}%` });
    // `career` es una lista cerrada (CAREERS) → match exacto.
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

  async create(dto: CreateSubjectDto): Promise<Subject> {
    return this.subjectRepo.save(this.subjectRepo.create(dto));
  }

  async getUniversities(search?: string): Promise<string[]> {
    const qb = this.subjectRepo
      .createQueryBuilder('s')
      .select('DISTINCT s.university', 'university')
      .where('s.is_active = true');

    if (search) {
      qb.andWhere('s.university ILIKE :search', { search: `%${search}%` });
    }

    qb.orderBy('s.university', 'ASC');
    const rows = await qb.getRawMany();
    return rows.map((r) => r.university);
  }

  // Lista cerrada de carreras. `university` se acepta por compatibilidad pero
  // se ignora (la carrera ya no depende de la universidad).
  getCareers(_university?: string): string[] {
    return [...CAREERS];
  }
}
