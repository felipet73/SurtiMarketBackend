import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Dimension } from '../dto/ecoimpact.dto';

export type EcoImpactWeekDocument = HydratedDocument<EcoImpactWeek>;

@Schema({ _id: false })
export class Radar5 {
  @Prop({ min: 0, max: 10, required: true })
  waste: number;

  @Prop({ min: 0, max: 10, required: true })
  transport: number;

  @Prop({ min: 0, max: 10, required: true })
  energy: number;

  @Prop({ min: 0, max: 10, required: true })
  water: number;

  @Prop({ min: 0, max: 10, required: true })
  consumption: number;
}
export const Radar5Schema = SchemaFactory.createForClass(Radar5);

@Schema({ _id: false })
export class EcoImpactMessage {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  text: string;

  @Prop({ required: true, trim: true })
  cta: string;

  @Prop({ required: true, enum: Dimension })
  dimension: Dimension;
}
export const EcoImpactMessageSchema = SchemaFactory.createForClass(EcoImpactMessage);

@Schema({ _id: false })
export class EcoImpactAiData {
  @Prop({ required: true, trim: true })
  summary: string;

  @Prop({ type: [EcoImpactMessageSchema], default: [] })
  messages: EcoImpactMessage[];
}
export const EcoImpactAiDataSchema = SchemaFactory.createForClass(EcoImpactAiData);

export enum EcoImpactWeekStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

@Schema({ timestamps: true })
export class EcoImpactWeek {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  groupId: Types.ObjectId;

  @Prop({ required: true })
  weekKey: string;

  @Prop({ enum: EcoImpactWeekStatus, default: EcoImpactWeekStatus.ACTIVE })
  status: EcoImpactWeekStatus;

  @Prop({ enum: Dimension, required: true })
  focusDimension: Dimension;

  @Prop({ type: Radar5Schema, required: true })
  baselineRadar: Radar5;

  @Prop({ type: Radar5Schema, required: true })
  currentRadar: Radar5;

  @Prop({ type: Radar5Schema, required: true })
  targetRadar: Radar5;

  @Prop({ type: EcoImpactAiDataSchema, required: true })
  ai: EcoImpactAiData;

  createdAt: Date;
  updatedAt: Date;
}

export const EcoImpactWeekSchema = SchemaFactory.createForClass(EcoImpactWeek);
EcoImpactWeekSchema.index({ groupId: 1, weekKey: 1 }, { unique: true });
