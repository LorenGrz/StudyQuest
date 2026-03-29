import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from '../../common/dto';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        userId: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        userId: string;
    }>;
    refresh(userId: string, token: string): Promise<{
        accessToken: string;
        refreshToken: string;
        userId: string;
    }>;
    logout(userId: string, refreshToken: string): Promise<void>;
    private buildTokens;
}
