import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DashboardWeeklyImageCacheDocument = HydratedDocument<DashboardWeeklyImageCache>;

@Schema({ timestamps: true })
export class DashboardWeeklyImageCache {
  @Prop({ required: true, unique: true, index: true })
  weekKey: string; // 2026-W05

  @Prop({ required: true })
  imageMimeType: string; // image/png

  @Prop({ required: true })
  imageBase64: string; // por ahora guardamos base64; luego lo subimos a S3 y guardas URL

  createdAt: Date;
  updatedAt: Date;
}

export const DashboardWeeklyImageCacheSchema = SchemaFactory.createForClass(DashboardWeeklyImageCache);
DashboardWeeklyImageCacheSchema.index({ weekKey: 1 }, { unique: true });