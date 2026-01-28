import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EcoNeighborhoodAssetDocument = HydratedDocument<EcoNeighborhoodAsset>;

export enum AssetType {
  MEDAL = 'MEDAL',
  TROPHY = 'TROPHY',
  BUILDING = 'BUILDING',
  DECORATION = 'DECORATION',
}

export enum Rarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

@Schema({ timestamps: true })
export class EcoNeighborhoodAsset {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  groupId: Types.ObjectId;

  @Prop({ required: true, enum: AssetType, index: true })
  assetType: AssetType;

  @Prop({ required: true, trim: true })
  assetKey: string; // e.g. MEDAL_WATER_W05

  @Prop({ required: true, enum: Rarity, default: Rarity.COMMON })
  rarity: Rarity;

  @Prop({ required: true })
  awardedAt: Date;

  @Prop({ type: Object })
  reasonRef?: any; // { weekKey, dimension, source: 'WEEKLY_PROGRESS' }
}

export const EcoNeighborhoodAssetSchema = SchemaFactory.createForClass(EcoNeighborhoodAsset);
EcoNeighborhoodAssetSchema.index({ groupId: 1, assetKey: 1 }, { unique: true });