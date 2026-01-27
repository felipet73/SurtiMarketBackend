import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WeeklyAssignmentDocument = HydratedDocument<WeeklyAssignment>;

@Schema({ timestamps: true })
export class WeeklyAssignment {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  weekKey: string; // ej: 2026-W05

  @Prop({ required: true })
  focusDimension: 'waste' | 'transport' | 'energy' | 'water' | 'consumption';

  @Prop({ type: Types.ObjectId, required: true })
  challengeId: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const WeeklyAssignmentSchema = SchemaFactory.createForClass(WeeklyAssignment);
WeeklyAssignmentSchema.index({ userId: 1, weekKey: 1 }, { unique: true });