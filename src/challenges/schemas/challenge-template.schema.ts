import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChallengeTemplateDocument = HydratedDocument<ChallengeTemplate>;

export type DimensionKey = 'waste' | 'transport' | 'energy' | 'water' | 'consumption';
export type ChallengeCadence = 'DAILY' | 'WEEKLY' | 'ONE_TIME';
export type GameType = 'QUIZ';

@Schema({ timestamps: true })
export class ChallengeTemplate {
  @Prop({ required: true, unique: true, index: true })
  key: string; // WEEKLY_QUIZ_WASTE_V1

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ required: true, enum: ['DAILY', 'WEEKLY', 'ONE_TIME'], index: true })
  cadence: ChallengeCadence;

  @Prop({ required: true, enum: ['QUIZ'], index: true })
  gameType: GameType;

  @Prop({ required: true, enum: ['waste','transport','energy','water','consumption'], index: true })
  focusDimension: DimensionKey;

  @Prop({ default: 'es-EC' })
  locale: string;

  @Prop({ required: true, min: 0 })
  rewardEcoCoins: number;

  // Prompts configurables
  @Prop({ required: true })
  systemPrompt: string;

  @Prop({ required: true })
  userPrompt: string;

  // JSON Schema (Structured Outputs)
  @Prop({ type: Object, required: true })
  jsonSchema: any;

  // Imagen tipo “card” para el reto
  @Prop({ required: true })
  cardImagePrompt: string;

  @Prop({ default: 3, min: 1, max: 10 })
  numQuestions: number;

  @Prop({ default: 0.4, min: 0, max: 2 })
  temperature: number;

  createdAt: Date;
  updatedAt: Date;
}

export const ChallengeTemplateSchema = SchemaFactory.createForClass(ChallengeTemplate);
ChallengeTemplateSchema.index({ cadence: 1, gameType: 1, focusDimension: 1, isActive: 1 });