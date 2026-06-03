import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Subject } from '../subjects/subject.entity';
import { Quest } from '../quests/quest.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Subject) private subjectRepo: Repository<Subject>,
    @InjectRepository(Quest) private questRepo: Repository<Quest>,
  ) {}

  async searchGlobal(
    q: string,
    limit: number = 10,
  ): Promise<{
    users: any[];
    subjects: any[];
    quests: any[];
    totalResults: number;
  }> {
    const search = q.trim();
    const likeSearch = `%${search}%`;

    // Search users by username or displayName
    const users = await this.userRepo
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.username',
        'u.displayName',
        'u.avatarUrl',
        'u.university',
        'u.career',
      ])
      .where(
        `(similarity(u.username, :search) > 0.2
        OR similarity(u.display_name, :search) > 0.2
        OR u.username ILIKE :likeSearch
        OR u.display_name ILIKE :likeSearch)`,
        { search, likeSearch },
      )
      .orderBy('similarity(u.username, :search)', 'DESC')
      .limit(limit)
      .getRawMany();

    // Search subjects by name, code, description
    const subjects = await this.subjectRepo
      .createQueryBuilder('s')
      .select([
        's.id',
        's.name',
        's.code',
        's.university',
        's.career',
        's.semester',
        's.enrolled_count',
      ])
      .where('s.is_active = true')
      .andWhere(
        `(similarity(s.name, :search) > 0.2
        OR similarity(s.code, :search) > 0.3
        OR similarity(s.description, :search) > 0.1
        OR s.name ILIKE :likeSearch
        OR s.code ILIKE :likeSearch
        OR s.description ILIKE :likeSearch)`,
        { search, likeSearch },
      )
      .orderBy('similarity(s.name, :search)', 'DESC')
      .limit(limit)
      .getRawMany();

    // Search quests by title (only ready/active/completed)
    const quests = await this.questRepo
      .createQueryBuilder('q')
      .select([
        'q.id',
        'q.title',
        'q.subject_id',
        's.name',
        'q.status',
        'q.created_at',
      ])
      .leftJoin('q.subject', 's')
      .where('q.status IN (:...statuses)', { statuses: ['ready', 'active', 'completed'] })
      .andWhere(
        `(similarity(q.title, :search) > 0.2
        OR q.title ILIKE :likeSearch)`,
        { search, likeSearch },
      )
      .orderBy('similarity(q.title, :search)', 'DESC')
      .limit(limit)
      .getRawMany();

    // Transform raw results to DTOs
    const usersDto = users.map((u) => ({
      id: u.u_id,
      username: u.u_username,
      displayName: u.u_displayName,
      avatarUrl: u.u_avatarUrl,
      university: u.u_university,
      career: u.u_career,
    }));

    const subjectsDto = subjects.map((s) => ({
      id: s.s_id,
      name: s.s_name,
      code: s.s_code,
      university: s.s_university,
      career: s.s_career,
      semester: s.s_semester,
      enrolledCount: s.s_enrolled_count,
    }));

    const questsDto = quests.map((q) => ({
      id: q.q_id,
      title: q.q_title,
      subjectId: q.q_subject_id,
      subjectName: q.s_name,
      status: q.q_status,
      createdAt: q.q_created_at,
    }));

    return {
      users: usersDto,
      subjects: subjectsDto,
      quests: questsDto,
      totalResults: usersDto.length + subjectsDto.length + questsDto.length,
    };
  }
}
