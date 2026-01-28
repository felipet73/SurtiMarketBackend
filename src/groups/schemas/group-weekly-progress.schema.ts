import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GroupWeeklyProgressDocument = HydratedDocument<GroupWeeklyProgress>;

@Schema({ timestamps: true })
export class GroupWeeklyProgress {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  groupId: Types.ObjectId;

  @Prop({ required: true, index: true })
  weekKey: string; // 2026-W05

  @Prop({ required: true, default: 0, min: 0 })
  quizPassCount: number;

  @Prop({ required: true, default: 0, min: 0 })
  targetQuizPasses: number;

  @Prop({ required: true, default: false, index: true })
  isCompleted: boolean;

  @Prop({ required: true, default: 0, min: 0, index: true })
  pointsEarned: number;

  // última dimensión foco (para medalla)
  @Prop({ enum: ['waste','transport','energy','water','consumption'], required: false })
  dimension?: 'waste'|'transport'|'energy'|'water'|'consumption';

  createdAt: Date;
  updatedAt: Date;
}

export const GroupWeeklyProgressSchema = SchemaFactory.createForClass(GroupWeeklyProgress);
GroupWeeklyProgressSchema.index({ groupId: 1, weekKey: 1 }, { unique: true });
GroupWeeklyProgressSchema.index({ weekKey: 1, pointsEarned: -1 });