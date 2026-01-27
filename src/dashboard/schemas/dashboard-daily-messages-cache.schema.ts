import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DashboardDailyMessagesCacheDocument = HydratedDocument<DashboardDailyMessagesCache>;

@Schema({ timestamps: true })
export class DashboardDailyMessagesCache {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  dateKey: string; // YYYY-MM-DD (zona local)

  @Prop({ type: Array, required: true })
  messages: Array<{
    title: string;
    text: string;
    dimension: 'waste' | 'transport' | 'energy' | 'water' | 'consumption';
    cta: string;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

export const DashboardDailyMessagesCacheSchema = SchemaFactory.createForClass(DashboardDailyMessagesCache);
DashboardDailyMessagesCacheSchema.index({ userId: 1, dateKey: 1 }, { unique: true });