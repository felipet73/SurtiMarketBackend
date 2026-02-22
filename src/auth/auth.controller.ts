import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { UsersService } from '../users/users.service';
import type { Request } from 'express';
import { RequestUser } from './types/request-user.type';
import { FileInterceptor } from '@nestjs/platform-express';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { Roles } from '../common/decorators/role.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from './guards/roles.guard';

type UploadedAvatarFile = {
  size: number;
  mimetype: string;
  originalname: string;
  buffer: Buffer;
};

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

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const userReq = req.user as RequestUser;
    const user = await this.usersService.updateProfile(userReq.sub, dto);

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

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@Req() req: Request, @UploadedFile() file?: UploadedAvatarFile) {
    if (!file) throw new BadRequestException('Archivo requerido en campo "file"');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('Tamaño maximo: 5MB');

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa JPG, PNG o WEBP');
    }

    const userReq = req.user as RequestUser;
    const userId = userReq.sub;
    const safeExt = extname(file.originalname || '').toLowerCase();
    const ext = safeExt && ['.jpg', '.jpeg', '.png', '.webp'].includes(safeExt) ? safeExt : '.jpg';
    const fileName = `${Date.now()}${ext}`;
    const dir = join(process.cwd(), 'public', 'avatars', userId);
    const fullPath = join(dir, fileName);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file.buffer);

    const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const avatarUrl = `${publicBaseUrl}/public/avatars/${userId}/${fileName}`;

    const user = await this.usersService.updateProfile(userId, { avatarUrl });
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
}
