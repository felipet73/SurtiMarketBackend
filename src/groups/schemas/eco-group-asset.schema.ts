import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EcoGroupAssetDocument = HydratedDocument<EcoGroupAsset>;

export enum AssetType {
  MEDAL = 'MEDAL',
  TROPHY = 'TROPHY',
  BUILDING = 'BUILDING',
  DECORATION = 'DECORATION',
}

export enum AssetRarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

@Schema({ timestamps: true })
export class EcoGroupAsset {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  groupId: Types.ObjectId;

  @Prop({ required: true, enum: AssetType, index: true })
  assetType: AssetType;

  @Prop({ required: true, trim: true, index: true })
  assetKey: string; // ej: MEDAL_W05_WASTE

  @Prop({ enum: AssetRarity, default: AssetRarity.COMMON })
  rarity: AssetRarity;

  @Prop({ required: true })
  awardedAt: Date;

  @Prop()
  reasonRef?: string; // weekKey o instanceId

  createdAt: Date;
  updatedAt: Date;
}

export const EcoGroupAssetSchema = SchemaFactory.createForClass(EcoGroupAsset);
EcoGroupAssetSchema.index({ groupId: 1, assetKey: 1 }, { unique: true });
EcoGroupAssetSchema.index({ groupId: 1, assetType: 1, awardedAt: -1 });