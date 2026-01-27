import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChallengesService } from './challenges.service';
import { Body } from '@nestjs/common';
import { SubmitWeeklyQuizDto } from './dto/submit-weekly-quiz.dto';

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

  @Get('weekly/me')
  @UseGuards(JwtAuthGuard)
  weeklyMe(@Req() req: any) {
    return this.challenges.getWeeklyChallengeForUser(req.user.sub);
  }

  @Get('weekly-quiz/me')
  @UseGuards(JwtAuthGuard)
  weeklyQuizMe(@Req() req: any) {
    return this.challenges.getWeeklyQuizForUser(req.user.sub);
  }

  @Post('weekly-quiz/:instanceId/submit')
  @UseGuards(JwtAuthGuard)
  submitWeeklyQuiz(
    @Req() req: any,
    @Param('instanceId') instanceId: string,
    @Body() dto: SubmitWeeklyQuizDto,
  ) {
    return this.challenges.submitWeeklyQuiz(req.user.sub, instanceId, dto.answers);
  }
}