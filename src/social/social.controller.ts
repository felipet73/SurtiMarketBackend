import { Body, Controller, Post, Req, UseGuards, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SocialService } from './social.service';
import { FriendRequestDto } from './dto/friend-request.dto';

@Controller()
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Post('friends/request')
  @UseGuards(JwtAuthGuard)
  requestFriend(@Req() req: any, @Body() dto: FriendRequestDto) {
    return this.social.requestFriend(req.user.sub, dto.targetUserId);
  }

  @Get('friends/me')
  @UseGuards(JwtAuthGuard)
  getMyFriends(@Req() req: any) {
    return this.social.getMyFriends(req.user.sub);
  }
}