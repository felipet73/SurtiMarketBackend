import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChallengeDocument = HydratedDocument<Challenge>;

export enum ChallengeType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  ONE_TIME = 'ONE_TIME',
}

@Schema({ timestamps: true })
export class Challenge {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, min: 0 })
  rewardEcoCoins: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true, enum: ChallengeType })
  type: ChallengeType;

  @Prop({ default: false })
  isGroup?: boolean;

  @Prop()
  startsAt?: Date;

  @Prop()
  endsAt?: Date;

  @Prop({ trim: true, index: true })
  focusDimension?: 'waste' | 'transport' | 'energy' | 'water' | 'consumption';

  createdAt: Date;
  updatedAt: Date;
}

export const ChallengeSchema = SchemaFactory.createForClass(Challenge);
ChallengeSchema.index({ isActive: 1, type: 1 });
