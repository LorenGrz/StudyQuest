import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './subject.entity';
import { CreateSubjectDto, SubjectQueryDto } from '../../common/dto';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
  ) {}

  async findAll(query: SubjectQueryDto) {
    const {
      search,
      university,
      career,
      semester,
      page = 1,
      limit = 20,
    } = query;

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
    if (career)
      qb.andWhere('s.career ILIKE :career', { career: `%${career}%` });
    if (semester) qb.andWhere('s.semester = :semester', { semester });

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

  async getCareers(university: string): Promise<string[]> {
    const rows = await this.subjectRepo
      .createQueryBuilder('s')
      .select('DISTINCT s.career', 'career')
      .where('s.university ILIKE :uni AND s.is_active = true', {
        uni: `%${university}%`,
      })
      .orderBy('s.career', 'ASC')
      .getRawMany();
    return rows.map((r) => r.career);
  }
}
