import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FriendshipDocument = HydratedDocument<Friendship>;

export enum FriendshipStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  BLOCKED = 'BLOCKED',
}

@Schema({ timestamps: true })
export class Friendship {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  requesterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  addresseeId: Types.ObjectId;

  @Prop({ required: true, enum: FriendshipStatus, default: FriendshipStatus.PENDING, index: true })
  status: FriendshipStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const FriendshipSchema = SchemaFactory.createForClass(Friendship);
// Evita duplicados en una dirección
FriendshipSchema.index({ requesterId: 1, addresseeId: 1 }, { unique: true });
FriendshipSchema.index({ addresseeId: 1, status: 1, createdAt: -1 });