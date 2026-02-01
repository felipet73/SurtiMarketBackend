import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'user_streaks' })
export class UserStreak {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  userId!: Types.ObjectId;

  // Fechas "YYYY-MM-DD" (únicas)
  @Prop({ type: [String], default: [] })
  loggedDates!: string[];

  @Prop({ type: Number, default: 0 })
  bestStreak!: number;
}

export type UserStreakDocument = HydratedDocument<UserStreak>;
export const UserStreakSchema = SchemaFactory.createForClass(UserStreak);