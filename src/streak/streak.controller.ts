import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { StreakService } from './streak.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('streak')
@UseGuards(AuthGuard('jwt'))
export class StreakController {
  constructor(private readonly streaks: StreakService) {}

  @Post('mark')
  async mark(@Req() req: any) {
    // asumiendo req.user.sub
    return this.streaks.markToday(req.user.sub);
  }

  @Get('me')
  async me(@Req() req: any) {
    return this.streaks.getMe(req.user.sub);
  }
}