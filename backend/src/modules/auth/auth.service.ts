import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from '../../common/dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    return this.buildTokens(user.id, user.email, user.username, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    return this.buildTokens(user.id, user.email, user.username, user.role);
  }

  async refresh(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;
      const valid = await this.usersService.validateRefreshToken(userId, token);
      if (!valid) throw new UnauthorizedException('Refresh token inválido');
      const user = await this.usersService.findById(userId);
      return this.buildTokens(user.id, user.email, user.username, user.role);
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async logout(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.usersService.removeRefreshToken(userId, hashed);
  }

  private async buildTokens(userId: string, email: string, username: string, role = 'USER') {
    const payload = { sub: userId, email, username, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { expiresIn: '30d' }),
    ]);
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.usersService.saveRefreshToken(userId, hashedRefresh);
    return { accessToken, refreshToken, userId };
  }
}
