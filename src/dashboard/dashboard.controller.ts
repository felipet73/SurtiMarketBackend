import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('awareness')
  @UseGuards(JwtAuthGuard)
  awareness(@Req() req: any) {
    return this.dashboard.getAwarenessSection(req.user.sub);
  }

   @Get('progress/weekly')
    @UseGuards(JwtAuthGuard)
    weeklyProgress(@Req() req: any) {
      return this.dashboard.getWeeklyProgress(req.user.sub);
    }


}