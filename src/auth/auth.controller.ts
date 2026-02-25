import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UsersService } from '../users/users.service';
import { RequestUser } from './types/request-user.type';
import { Roles } from '../common/decorators/role.decorator';
import { Role } from '../common/enums/role.enum';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

type UploadedAvatarFile = {
  size: number;
  mimetype: string;
  originalname: string;
  buffer: Buffer;
};

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private readonly usersService: UsersService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const userReq = req.user as RequestUser;
    const user = await this.usersService.findById(userReq.sub);

    if (!user.isActive) {
      return { isActive: false };
    }

    return this.toUserResponse(user);
  }

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
    return this.toUserResponse(user);
  }

  // Nuevo endpoint por defecto: Cloudinary
  @Post('me/avatar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@Req() req: Request, @UploadedFile() file?: UploadedAvatarFile) {
    this.validateAvatarFile(file);
    if (!this.cloudinary.isConfigured()) {
      throw new BadRequestException('Cloudinary no configurado. Usa /auth/me/avatar-legacy o configura CLOUDINARY_*');
    }

    const userReq = req.user as RequestUser;
    const userId = userReq.sub;
    const format = this.getPreferredImageFormat(file!.originalname);

    const uploaded = await this.cloudinary.uploadImageBuffer({
      buffer: file!.buffer,
      folder: `avatars/${userId}`,
      publicId: `${Date.now()}`,
      format,
      overwrite: true,
    });

    const user = await this.usersService.updateProfile(userId, { avatarUrl: uploaded.secureUrl });
    return this.toUserResponse(user);
  }

  // Endpoint legacy (filesystem local /public)
  @Post('me/avatar-legacy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatarLegacy(@Req() req: Request, @UploadedFile() file?: UploadedAvatarFile) {
    this.validateAvatarFile(file);

    const userReq = req.user as RequestUser;
    const userId = userReq.sub;
    const safeExt = extname(file!.originalname || '').toLowerCase();
    const ext = safeExt && ['.jpg', '.jpeg', '.png', '.webp'].includes(safeExt) ? safeExt : '.jpg';
    const fileName = `${Date.now()}${ext}`;
    const dir = join(process.cwd(), 'public', 'avatars', userId);
    const fullPath = join(dir, fileName);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file!.buffer);

    const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const avatarUrl = `${publicBaseUrl}/public/avatars/${userId}/${fileName}`;

    const user = await this.usersService.updateProfile(userId, { avatarUrl });
    return this.toUserResponse(user);
  }

  private validateAvatarFile(file?: UploadedAvatarFile) {
    if (!file) throw new BadRequestException('Archivo requerido en campo "file"');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('Tamano maximo: 5MB');

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa JPG, PNG o WEBP');
    }
  }

  private getPreferredImageFormat(fileName: string) {
    const ext = extname(fileName || '').toLowerCase();
    if (ext === '.png') return 'png';
    if (ext === '.webp') return 'webp';
    return 'jpg';
  }

  private toUserResponse(user: Awaited<ReturnType<UsersService['findById']>>) {
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
