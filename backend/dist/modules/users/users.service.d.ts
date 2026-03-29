import { Repository, DataSource } from 'typeorm';
import { User } from './user.entity';
import { Subject } from '../subjects/subject.entity';
import { RegisterDto, UpdateProfileDto } from '../../common/dto';
export declare class UsersService {
    private readonly userRepo;
    private readonly subjectRepo;
    private readonly dataSource;
    constructor(userRepo: Repository<User>, subjectRepo: Repository<Subject>, dataSource: DataSource);
    create(dto: RegisterDto): Promise<User>;
    findById(id: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<User>;
    enrollSubject(userId: string, subjectId: string): Promise<User>;
    unenrollSubject(userId: string, subjectId: string): Promise<User>;
    addXp(userId: string, xpAmount: number): Promise<void>;
    updateStreak(userId: string): Promise<void>;
    saveRefreshToken(userId: string, hashedToken: string): Promise<void>;
    removeRefreshToken(userId: string, hashedToken: string): Promise<void>;
    validateRefreshToken(userId: string, token: string): Promise<boolean>;
}
