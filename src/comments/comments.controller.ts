import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUser } from '../auth/types/request-user.type';
import { CommentsService } from './comments.service';
import { SendCommentToGroupDto, SendCommentToUserDto } from './dto/send-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('me/received')
  @UseGuards(JwtAuthGuard)
  received(@Req() req: Request) {
    const user = req.user as RequestUser;
    return this.comments.listReceived(user.sub);
  }

  @Get('me/with/:userId')
  @UseGuards(JwtAuthGuard)
  withUser(@Req() req: Request, @Param('userId') userId: string) {
    const user = req.user as RequestUser;
    return this.comments.listWithUser(user.sub, userId);
  }

  @Post('user')
  @UseGuards(JwtAuthGuard)
  sendToUser(@Req() req: Request, @Body() dto: SendCommentToUserDto) {
    const user = req.user as RequestUser;
    return this.comments.sendToUser(user.sub, dto.recipientUserId, dto.text);
  }

  @Post('group')
  @UseGuards(JwtAuthGuard)
  sendToGroup(@Req() req: Request, @Body() dto: SendCommentToGroupDto) {
    const user = req.user as RequestUser;
    return this.comments.sendToMyGroup(user.sub, dto.text);
  }
}
