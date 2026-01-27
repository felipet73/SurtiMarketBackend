import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DashboardPromptTemplateDocument = HydratedDocument<DashboardPromptTemplate>;

@Schema({ timestamps: true })
export class DashboardPromptTemplate {
  @Prop({ required: true, unique: true, index: true })
  key: string; // DASHBOARD_AWARENESS_ES_V1

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 'es-EC' })
  locale: string;

  @Prop({ required: true })
  systemPrompt: string;

  @Prop({ required: true })
  userPrompt: string;

  // JSON Schema para structured outputs
  @Prop({ type: Object, required: true })
  jsonSchema: any;

  // Prompt para imagen semanal global
  @Prop({ required: true })
  weeklyImagePrompt: string;

  @Prop({ default: 24, min: 1 })
  dailyCacheHours: number;

  @Prop({ default: 7, min: 1 })
  weeklyImageCacheDays: number;

  createdAt: Date;
  updatedAt: Date;
}

export const DashboardPromptTemplateSchema = SchemaFactory.createForClass(DashboardPromptTemplate);
DashboardPromptTemplateSchema.index({ key: 1 }, { unique: true });