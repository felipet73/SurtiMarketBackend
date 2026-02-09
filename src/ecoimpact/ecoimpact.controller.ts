import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EcoImpactService } from './ecoimpact.service';
import { CompareQueryDto, EcoImpactEventDto, LeaderboardQueryDto, ProgressQueryDto } from './dto/ecoimpact.dto';
import type { Request } from 'express';
import { RequestUser } from '../auth/types/request-user.type';

@Controller('ecoimpact')
export class EcoImpactController {
  constructor(private readonly ecoimpact: EcoImpactService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: Request) {
    const user = req.user as RequestUser;
    return this.ecoimpact.getMyEcoImpact(user.sub);
  }

  @Post('event')
  @UseGuards(JwtAuthGuard)
  registerEvent(@Req() req: Request, @Body() dto: EcoImpactEventDto) {
    const user = req.user as RequestUser;
    return this.ecoimpact.registerEvent(user.sub, dto);
  }

  @Get('leaderboard')
  @UseGuards(JwtAuthGuard)
  leaderboard(@Req() req: Request, @Query() query: LeaderboardQueryDto) {
    const user = req.user as RequestUser;
    return this.ecoimpact.getLeaderboard(user.sub, query.weekKey, query.limit ?? 10, query.page ?? 1);
  }

  @Get('compare')
  @UseGuards(JwtAuthGuard)
  compare(@Req() req: Request, @Query() query: CompareQueryDto) {
    const user = req.user as RequestUser;
    return this.ecoimpact.compareGroups(user.sub, query.groupIds, query.weekKey);
  }

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  progress(@Req() req: Request, @Query() query: ProgressQueryDto) {
    const user = req.user as RequestUser;
    return this.ecoimpact.getProgress(user.sub, query.weekKey);
  }
}
