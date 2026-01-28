import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EcoGroupInviteDocument = HydratedDocument<EcoGroupInvite>;

export enum InviteStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

@Schema({ timestamps: true })
export class EcoGroupInvite {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  inviterId: Types.ObjectId;

  @Prop({ required: true, trim: true, unique: true, index: true })
  code: string;

  @Prop({ default: InviteStatus.ACTIVE, enum: InviteStatus, index: true })
  status: InviteStatus;

  @Prop({ default: 0, min: 0 })
  uses: number;

  @Prop({ default: 20, min: 1 })
  maxUses: number;

  @Prop({ required: true })
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const EcoGroupInviteSchema = SchemaFactory.createForClass(EcoGroupInvite);
EcoGroupInviteSchema.index({ groupId: 1, status: 1, expiresAt: 1 });