import { Repository } from 'typeorm';
import { Subject } from './subject.entity';
import { CreateSubjectDto, SubjectQueryDto } from '../../common/dto';
export declare class SubjectsService {
    private readonly subjectRepo;
    constructor(subjectRepo: Repository<Subject>);
    findAll(query: SubjectQueryDto): Promise<{
        items: Subject[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(id: string): Promise<Subject>;
    create(dto: CreateSubjectDto): Promise<Subject>;
    getUniversities(search?: string): Promise<string[]>;
    getCareers(university: string): Promise<string[]>;
}
