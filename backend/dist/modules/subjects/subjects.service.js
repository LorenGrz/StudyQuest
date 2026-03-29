"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const subject_entity_1 = require("./subject.entity");
let SubjectsService = class SubjectsService {
    subjectRepo;
    constructor(subjectRepo) {
        this.subjectRepo = subjectRepo;
    }
    async findAll(query) {
        const { search, university, career, semester, page = 1, limit = 20, } = query;
        const qb = this.subjectRepo
            .createQueryBuilder('s')
            .where('s.is_active = true');
        if (search) {
            qb.andWhere(`(similarity(s.name, :search) > 0.2
        OR similarity(s.code, :search) > 0.3
        OR s.name ILIKE :likeSearch
        OR s.code ILIKE :likeSearch)`, { search, likeSearch: `%${search}%` }).orderBy('similarity(s.name, :search)', 'DESC');
        }
        else {
            qb.orderBy('s.enrolled_count', 'DESC');
        }
        if (university)
            qb.andWhere('s.university ILIKE :uni', { uni: `%${university}%` });
        if (career)
            qb.andWhere('s.career ILIKE :career', { career: `%${career}%` });
        if (semester)
            qb.andWhere('s.semester = :semester', { semester });
        const [items, total] = await qb
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async findById(id) {
        const subject = await this.subjectRepo.findOneBy({ id });
        if (!subject)
            throw new common_1.NotFoundException('Materia no encontrada');
        return subject;
    }
    async create(dto) {
        return this.subjectRepo.save(this.subjectRepo.create(dto));
    }
    async getUniversities(search) {
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
    async getCareers(university) {
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
};
exports.SubjectsService = SubjectsService;
exports.SubjectsService = SubjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subject_entity_1.Subject)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SubjectsService);
//# sourceMappingURL=subjects.service.js.map