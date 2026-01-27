import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type QuizSubmissionDocument = HydratedDocument<QuizSubmission>;

@Schema({ timestamps: true })
export class QuizSubmission {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  instanceId: Types.ObjectId;

  @Prop({ type: [Number], required: true })
  answers: number[];

  @Prop({ required: true, min: 0 })
  totalQuestions: number;

  @Prop({ required: true, min: 0 })
  correctCount: number;

  @Prop({ required: true, min: 0, max: 100 })
  scorePercent: number;

  @Prop({ required: true })
  passed: boolean;

  // para idempotencia de pago
  @Prop({ default: false, index: true })
  rewardGranted: boolean;

  @Prop({ min: 0 })
  ecoCoinsGranted?: number;

  createdAt: Date;
  updatedAt: Date;
}

export const QuizSubmissionSchema = SchemaFactory.createForClass(QuizSubmission);
QuizSubmissionSchema.index({ userId: 1, instanceId: 1 }, { unique: true }); // 1 submission por user+instance