import { SubjectsService } from './subjects.service';
import { CreateSubjectDto, SubjectQueryDto } from '../../common/dto';
export declare class SubjectsController {
    private readonly subjectsService;
    constructor(subjectsService: SubjectsService);
    findAll(query: SubjectQueryDto): Promise<{
        items: import("./subject.entity").Subject[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getUniversities(search?: string): Promise<string[]>;
    getCareers(university: string): Promise<string[]>;
    findOne(id: string): Promise<import("./subject.entity").Subject>;
    create(dto: CreateSubjectDto): Promise<import("./subject.entity").Subject>;
}
