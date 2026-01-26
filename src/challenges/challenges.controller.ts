import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChallengesService } from './challenges.service';

@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challenges: ChallengesService) {}

  @Get()
  list() {
    return this.challenges.listActive();
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  complete(@Req() req: any, @Param('id') id: string) {
    return this.challenges.completeChallenge(req.user.sub, id);
  }
}