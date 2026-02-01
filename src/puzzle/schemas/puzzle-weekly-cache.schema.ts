import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PuzzleWeeklyCacheDocument = HydratedDocument<PuzzleWeeklyCache>;

@Schema({ timestamps: true })
export class PuzzleWeeklyCache {
  @Prop({ required: true, unique: true, index: true })
  weekKey: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true })
  imageId: string;

  @Prop({ type: [{ correctIndex: Number, url: String }], default: [] })
  tiles: { correctIndex: number; url: string }[];

  // opcional: para debug/versionado
  @Prop()
  promptHash?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PuzzleWeeklyCacheSchema = SchemaFactory.createForClass(PuzzleWeeklyCache);