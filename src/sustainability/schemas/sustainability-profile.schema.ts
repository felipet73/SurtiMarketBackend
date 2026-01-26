import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SustainabilityProfileDocument = HydratedDocument<SustainabilityProfile>;

export type DimensionKey = 'waste' | 'transport' | 'energy' | 'water' | 'consumption';

@Schema({ _id: false })
export class AssessmentSnapshot {
  @Prop({ required: true })
  version: number;

  @Prop({ required: true })
  submittedAt: Date;

  // 10 respuestas (0-4)
  @Prop({ type: [Number], required: true })
  answers: number[];

  // Puntajes calculados
  @Prop({ required: true, min: 1, max: 10 })
  overallScore: number;

  @Prop({ type: Object, required: true })
  dimensionScores: Record<DimensionKey, number>;

  // Solo se llena en baseline
  @Prop({ min: 0 })
  ecoCoinsGranted?: number;
}

export const AssessmentSnapshotSchema = SchemaFactory.createForClass(AssessmentSnapshot);

@Schema({ timestamps: true })
export class SustainabilityProfile {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 10 })
  overallScore: number;

  @Prop({ type: Object, required: true })
  dimensionScores: Record<DimensionKey, number>;

  @Prop({ type: AssessmentSnapshotSchema, required: true })
  baseline: AssessmentSnapshot;

  @Prop({ type: AssessmentSnapshotSchema, required: true })
  latest: AssessmentSnapshot;

  createdAt: Date;
  updatedAt: Date;
}

export const SustainabilityProfileSchema = SchemaFactory.createForClass(SustainabilityProfile);
SustainabilityProfileSchema.index({ userId: 1 }, { unique: true });