import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { DimensionKey, ChallengeCadence, GameType } from './challenge-template.schema';

export type ChallengeInstanceDocument = HydratedDocument<ChallengeInstance>;

@Schema({ _id: false })
export class CardImageAsset {
  @Prop({ required: true })
  mimeType: string; // image/png
  @Prop({ required: true })
  base64: string;
}
export const CardImageAssetSchema = SchemaFactory.createForClass(CardImageAsset);

@Schema({ timestamps: true })
export class ChallengeInstance {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  templateId: Types.ObjectId;

  @Prop({ required: true })
  templateKey: string;

  @Prop({ required: true, enum: ['DAILY','WEEKLY','ONE_TIME'], index: true })
  cadence: ChallengeCadence;

  @Prop({ required: true, enum: ['QUIZ'], index: true })
  gameType: GameType;

  @Prop({ required: true, enum: ['waste','transport','energy','water','consumption'], index: true })
  focusDimension: DimensionKey;

  @Prop({ required: true, index: true })
  weekKey: string; // 2026-W05 (para weekly)

  @Prop({ type: Object, required: true })
  payload: any; // quiz JSON

  @Prop({ type: CardImageAssetSchema, required: true })
  cardImage: CardImageAsset;

  @Prop({ default: true, index: true })
  isPublished: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const ChallengeInstanceSchema = SchemaFactory.createForClass(ChallengeInstance);
ChallengeInstanceSchema.index({ templateId: 1, weekKey: 1 }, { unique: true }); // evita duplicar generación por template/semana
ChallengeInstanceSchema.index({ cadence: 1, weekKey: 1, focusDimension: 1, isPublished: 1 });