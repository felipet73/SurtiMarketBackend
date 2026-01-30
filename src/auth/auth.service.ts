import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { ConfigService } from '@nestjs/config';
import { Role } from '../common/enums/role.enum';


type JwtPayload = {
  sub: string;
  email: string;
  roles: Role[];
};

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private cfg: ConfigService,
  ) {}

  private signAccessToken(user: { id: string; email: string; roles: Role[] }) {
  const expiresIn = this.cfg.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    roles: user.roles,
  };

  return this.jwt.sign(payload, { expiresIn } as any);
}

  async registerClient(fullName: string, username: string, email: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.users.createUser({
      fullName,
      username,
      email,
      passwordHash,
      roles: [Role.CLIENT],
    });

    const accessToken = this.signAccessToken({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });

    return {
      accessToken,
      user: { id: user.id, fullName: user.fullName, email: user.email, roles: user.roles },
    };
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const accessToken = this.signAccessToken({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });

    return {
      accessToken,
      user: { id: user.id, fullName: user.fullName, email: user.email, roles: user.roles },
    };
  }
}
