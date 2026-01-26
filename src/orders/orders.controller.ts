import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.orders.createOrder(req.user.sub, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  my(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orders.myOrders(req.user.sub, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }
}