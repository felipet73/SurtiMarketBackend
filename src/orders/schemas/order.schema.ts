import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  nameSnapshot: string;

  @Prop({ required: true, min: 1 })
  qty: number;

  @Prop({ required: true, min: 0 })
  unitPriceMoney: number; // precio efectivo (promo o base)

  @Prop({ required: true, min: 0 })
  ecoCoinsSpent: number; // ecoCoins gastados en este ítem

  @Prop({ required: true, min: 0 })
  moneyDiscount: number; // descuento $ por ecoCoins en este ítem

  @Prop({ required: true, min: 0 })
  moneyToPay: number; // $ restante a pagar en este ítem
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  totalMoney: number;

  @Prop({ required: true, min: 0 })
  totalEcoCoinsSpent: number;

  @Prop({ required: true, min: 0 })
  totalMoneyDiscount: number;

  @Prop({ required: true, min: 0 })
  totalMoneyToPay: number;

  @Prop({ required: true, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ userId: 1, createdAt: -1 });