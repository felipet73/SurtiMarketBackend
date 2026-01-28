import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinByCodeDto } from './dto/join-by-code.dto';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: any, @Body() dto: CreateGroupDto) {
    return this.groups.createGroup(req.user.sub, dto);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  search(@Query('q') q: string) {
    return this.groups.searchGroups(q);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return this.groups.getMyGroup(req.user.sub);
  }

  @Post(':id/join-request')
  @UseGuards(JwtAuthGuard)
  joinRequest(@Req() req: any, @Param('id') groupId: string) {
    return this.groups.requestJoin(req.user.sub, groupId);
  }

  @Post('me/leave')
  @UseGuards(JwtAuthGuard)
  leave(@Req() req: any) {
    return this.groups.leaveGroup(req.user.sub);
  }

  @Post(':id/invite-link')
  @UseGuards(JwtAuthGuard)
  inviteLink(@Req() req: any, @Param('id') groupId: string) {
    return this.groups.createInviteLink(req.user.sub, groupId);
  }

  @Post('join-by-code')
  @UseGuards(JwtAuthGuard)
  joinByCode(@Req() req: any, @Body() dto: JoinByCodeDto) {
    return this.groups.joinByCode(req.user.sub, dto.code.trim());
  }
}