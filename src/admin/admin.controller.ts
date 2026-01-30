import { Body, Controller, Post, UseGuards, Get, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/role.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RolesGuard } from '../auth/guards/roles.guard';


@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly usersService: UsersService) {}

  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.usersService.createUser({
      fullName: dto.fullName,
      username: dto.username,
      email: dto.email,
      passwordHash,
      roles: [dto.role],
    });

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      roles: user.roles,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    return this.usersService.listUsers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      q,
    });
  }
}
