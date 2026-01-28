import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupProgressService } from './group-progress.service';
import { GroupsService } from './groups.service';

@Controller('groups')
export class GroupsExtrasController {
  constructor(
    private readonly progress: GroupProgressService,
    private readonly groups: GroupsService,
  ) {}

  @Get('leaderboard/weekly')
  @UseGuards(JwtAuthGuard)
  leaderboard(@Query('weekKey') weekKey: string) {
    return this.progress.weeklyLeaderboard(weekKey);
  }

  @Get('me/neighborhood')
  @UseGuards(JwtAuthGuard)
  async myNeighborhood(@Req() req: any) {
    const my = await this.groups.getMyGroup(req.user.sub);
    if (!my?.inGroup) return { inGroup: false, assets: [] };
    const assets = await this.progress.myNeighborhoodAssets(String(my.group!.id));
    return { inGroup: true, assets };
  }
}