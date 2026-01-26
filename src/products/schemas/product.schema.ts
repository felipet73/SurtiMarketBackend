import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ _id: false })
export class Promo {
  @Prop({ default: false })
  active: boolean;

  @Prop({ min: 0 })
  promoPrice?: number;

  @Prop()
  startsAt?: Date;

  @Prop()
  endsAt?: Date;
}

export const PromoSchema = SchemaFactory.createForClass(Promo);

@Schema({ _id: false })
export class Reward {
  @Prop({ default: false })
  active: boolean;

  @Prop({ min: 0 })
  costEcoCoins?: number;

  // Reglas mínimas (puedes extender luego)
  @Prop({ min: 0, max: 100 })
  minHabitScore?: number;

  @Prop({ trim: true })
  minCategory?: string; // BRONZE | SILVER | GOLD (si lo implementas)

  @Prop()
  startsAt?: Date;

  @Prop()
  endsAt?: Date;
}

export const RewardSchema = SchemaFactory.createForClass(Reward);

@Schema({ timestamps: true })
export class Product {
  // Identidad
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  brand?: string;

  @Prop({ trim: true, index: true })
  category?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [String], default: [] })
  images?: string[];

  @Prop({ type: [String], default: [], index: true })
  tags?: string[];

  // Estado / inventario
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0, min: 0 })
  stock: number;

  // Comercial
  @Prop({ required: true, trim: true, unique: true })
  sku: string;

  @Prop({ required: true, min: 0 })
  basePrice: number; // precio normal

  @Prop({ type: PromoSchema, default: { active: false } })
  promo: Promo;

  // Sostenibilidad
  @Prop({ default: 50, min: 0, max: 100 })
  ecoScore: number;

  @Prop({ default: 0, min: 0 })
  co2Kg?: number;

  @Prop({ type: [String], default: [] })
  badges?: string[]; // LOCAL, ORGANIC, RECYCLED, etc.

  // EcoCoins (descuento en compra híbrida)
  @Prop({ default: true })
  ecoCoinsEnabled: boolean;

  // 0.5 = 50% máximo de descuento con EcoCoins para este producto
  @Prop({ default: 0.5, min: 0, max: 1 })
  maxEcoCoinsDiscountPercent: number;

  // Premio / canje directo (opcional)
  @Prop({ type: RewardSchema, default: { active: false } })
  reward: Reward;

  createdAt: Date;
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Índices útiles
ProductSchema.index({ sku: 1 }, { unique: true });
ProductSchema.index({ name: 'text', brand: 'text', category: 'text', description: 'text', tags: 'text' });