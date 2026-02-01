import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserWeeklyPuzzleProgressDocument = HydratedDocument<UserWeeklyPuzzleProgress>;

@Schema({ timestamps: true })
export class UserWeeklyPuzzleProgress {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  weekKey: string;

  @Prop({ required: true, default: 3 })
  grid: number;

  @Prop({ type: [Number], required: true })
  positions: number[]; // 0..7 tiles, -1 blank

  //@Prop({ default: false })
  //isSolved: boolean;

  //@Prop({ default: false })
  //rewardGranted: boolean;

  // positions[i] = tileIndex que está en el slot i
  // solved cuando positions[i] === i para todo i
  //@Prop({ type: [Number], required: true })
  //positions: number[];

  @Prop({ default: false, index: true })
  isSolved: boolean;

  @Prop({ default: false, index: true })
  rewardGranted: boolean;

  @Prop({ default: 0, min: 0 })
  ecoCoinsGranted: number;

  @Prop({ default: 0, min: 0 })
  puzzlePointsGranted: number; // puntos “del juego” (para XP o badges luego)

  createdAt: Date;
  updatedAt: Date;
}

export const UserWeeklyPuzzleProgressSchema = SchemaFactory.createForClass(UserWeeklyPuzzleProgress);
UserWeeklyPuzzleProgressSchema.index({ userId: 1, weekKey: 1 }, { unique: true });