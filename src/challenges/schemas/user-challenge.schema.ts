import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserChallengeDocument = HydratedDocument<UserChallenge>;

export enum UserChallengeStatus {
  STARTED = 'STARTED',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
}

@Schema({ timestamps: true })
export class UserChallenge {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  challengeId: Types.ObjectId;

  @Prop({ required: true, enum: UserChallengeStatus, default: UserChallengeStatus.STARTED })
  status: UserChallengeStatus;

  @Prop()
  completedAt?: Date;

  @Prop({ default: false })
  rewardGranted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const UserChallengeSchema = SchemaFactory.createForClass(UserChallenge);
UserChallengeSchema.index({ userId: 1, challengeId: 1 }, { unique: true });