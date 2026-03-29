import { UsersService } from './users.service';
import { UpdateProfileDto, EnrollSubjectDto } from '../../common/dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(req: any): Promise<import("./user.entity").User>;
    updateMe(req: any, dto: UpdateProfileDto): Promise<import("./user.entity").User>;
    findOne(id: string): Promise<import("./user.entity").User>;
    enroll(req: any, dto: EnrollSubjectDto): Promise<import("./user.entity").User>;
    unenroll(req: any, subjectId: string): Promise<import("./user.entity").User>;
}
