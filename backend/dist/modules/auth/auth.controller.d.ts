import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from '../../common/dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    refresh(dto: RefreshTokenDto, req: any): Promise<{
        accessToken: string;
        refreshToken: string;
        userId: string;
    }>;
    logout(req: any, dto: RefreshTokenDto): Promise<void>;
}
