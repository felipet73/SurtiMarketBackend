import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EcoGroupDocument = HydratedDocument<EcoGroup>;

export enum GroupVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum GroupJoinPolicy {
  OPEN = 'OPEN',
  REQUEST_APPROVAL = 'REQUEST_APPROVAL',
  INVITE_ONLY = 'INVITE_ONLY',
}

@Schema({ timestamps: true })
export class EcoGroup {
  @Prop({ required: true, trim: true, index: true, maxlength: 50 })
  name: string;

  @Prop({ trim: true, maxlength: 200 })
  description?: string;

  @Prop({ enum: GroupVisibility, default: GroupVisibility.PUBLIC, index: true })
  visibility: GroupVisibility;

  @Prop({ enum: GroupJoinPolicy, default: GroupJoinPolicy.REQUEST_APPROVAL, index: true })
  joinPolicy: GroupJoinPolicy;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ default: 1, min: 1 })
  memberCount: number;

  // Gamificación grupal
  @Prop({ default: 1, min: 1, index: true })
  level: number;

  @Prop({ default: 0, min: 0 })
  xp: number;

  createdAt: Date;
  updatedAt: Date;
}

export const EcoGroupSchema = SchemaFactory.createForClass(EcoGroup);
EcoGroupSchema.index({ name: 1, visibility: 1 });
EcoGroupSchema.index({ ownerId: 1, createdAt: -1 });