import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EcoImpactDailySnapshotDocument = HydratedDocument<EcoImpactDailySnapshot>;

@Schema({ timestamps: true })
export class EcoImpactDailySnapshot {
  @Prop({ required: true, index: true })
  weekKey: string;

  @Prop({ required: true, index: true })
  dateKey: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  groupId: Types.ObjectId;

  @Prop({ required: true })
  score: number;

  @Prop({ required: true })
  rank: number;

  createdAt: Date;
  updatedAt: Date;
}

export const EcoImpactDailySnapshotSchema = SchemaFactory.createForClass(EcoImpactDailySnapshot);
EcoImpactDailySnapshotSchema.index({ weekKey: 1, dateKey: 1, groupId: 1 }, { unique: true });
