import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // (opcional) listar
  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Req() req: any) {
    return this.notifications.listMyNotifications(req.user.sub);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  accept(@Req() req: any, @Param('id') id: string) {
    return this.notifications.accept(req.user.sub, id);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  reject(@Req() req: any, @Param('id') id: string) {
    return this.notifications.reject(req.user.sub, id);
  }

  @Post('me/read-non-actionable')
  @UseGuards(JwtAuthGuard)
  markNonActionableAsRead(@Req() req: any) {
    return this.notifications.markNonActionableAsRead(req.user.sub);
  }
}
