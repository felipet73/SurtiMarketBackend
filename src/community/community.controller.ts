import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('users/search')
  @UseGuards(JwtAuthGuard)
  searchUsers(@Req() req: any, @Query('q') q: string) {
    return this.community.searchUsers(req.user.sub, q);
  }
}