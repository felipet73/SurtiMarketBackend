import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinByCodeDto } from './dto/join-by-code.dto';
import { InviteUserDto } from './dto/invite-user.dto';

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

  @Post(':id/invite-user')
  @UseGuards(JwtAuthGuard)
  inviteUser(@Req() req: any, @Param('id') groupId: string, @Body() dto: InviteUserDto) {
    return this.groups.inviteUserToGroup(req.user.sub, groupId, dto.userId);
  }

  @Post('invites/:notificationId/accept')
  @UseGuards(JwtAuthGuard)
  acceptInvite(@Req() req: any, @Param('notificationId') notificationId: string) {
    return this.groups.acceptGroupInvite(req.user.sub, notificationId);
  }

  @Get('me/join-requests')
  @UseGuards(JwtAuthGuard)
  myJoinRequests(@Req() req: any) {
    return this.groups.listMyJoinRequests(req.user.sub);
  }

  @Get(':id/join-requests')
  @UseGuards(JwtAuthGuard)
  listJoinRequests(@Req() req: any, @Param('id') groupId: string) {
    return this.groups.listJoinRequests(req.user.sub, groupId);
  }

  @Post(':id/join-requests/:userId/accept')
  @UseGuards(JwtAuthGuard)
  acceptJoinRequest(@Req() req: any, @Param('id') groupId: string, @Param('userId') userId: string) {
    return this.groups.acceptJoinRequest(req.user.sub, groupId, userId);
  }

  @Get('me/points-events')
  @UseGuards(JwtAuthGuard)
  listMyGroupPoints(@Req() req: any, @Query('weekKey') weekKey?: string) {
    return this.groups.listMyGroupPointsEvents(req.user.sub, weekKey);
  }
}
