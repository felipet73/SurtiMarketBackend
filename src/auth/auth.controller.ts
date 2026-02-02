import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { UsersService } from '../users/users.service';
import type { Request } from 'express';
import { RequestUser } from './types/request-user.type';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private readonly usersService: UsersService) {
    
  }


  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const userReq = req.user as RequestUser;

    // Verifica existencia y estado en DB
    const user = await this.usersService.findById(userReq.sub);

    if (!user.isActive) {
      // Si quieres, puedes lanzar Unauthorized aquí
      return { isActive: false };
    }

    // Respuesta saneada (sin passwordHash)
    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      displayName: user?.displayName ?? '',
      avatarUrl: user?.avatarUrl ?? '',
      privacy: user.privacy,
      email: user.email,
      roles: user.roles,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // Registro por defecto: CLIENTE
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.registerClient(dto.fullName, dto.username, dto.email, dto.password);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
