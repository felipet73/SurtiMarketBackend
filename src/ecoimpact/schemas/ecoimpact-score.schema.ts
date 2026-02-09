import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EcoImpactScoreDocument = HydratedDocument<EcoImpactScore>;

@Schema({ timestamps: true })
export class EcoImpactScore {
  @Prop({ required: true, index: true })
  weekKey: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  groupId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  groupName: string;

  @Prop({ required: true })
  score: number;

  @Prop({ required: true })
  rawPoints: number;

  @Prop({ required: true })
  activeMembers: number;

  @Prop({ required: true })
  memberCount: number;

  @Prop({ required: true })
  participationRate: number;

  @Prop({ required: true })
  rank: number;

  @Prop({ required: true })
  deltaRank: number;

  createdAt: Date;
  updatedAt: Date;
}

export const EcoImpactScoreSchema = SchemaFactory.createForClass(EcoImpactScore);
EcoImpactScoreSchema.index({ weekKey: 1, groupId: 1 }, { unique: true });
