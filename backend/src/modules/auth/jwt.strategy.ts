/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.getOrThrow('JWT_SECRET'),
    });
  }

  validate(payload: {
    sub: string;
    email: string;
    username: string;
    role?: string;
    type?: string;
  }) {
    // A refresh token must not be usable as an access token. Tokens issued
    // before the `type` claim existed have no `type` and are still accepted
    // (they age out within 15 min / one refresh).
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('Token inválido');
    }
    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role ?? 'USER',
    };
  }
}
