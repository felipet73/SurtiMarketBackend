import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WalletLedgerDocument = HydratedDocument<WalletLedger>;

export enum LedgerType {
  EARN = 'EARN',
  SPEND = 'SPEND',
  ADJUST = 'ADJUST',
  REFUND = 'REFUND',
}

@Schema({ timestamps: true })
export class WalletLedger {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: LedgerType })
  type: LedgerType;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, trim: true })
  source: string; // ORDER, CHALLENGE, ADMIN, etc.

  @Prop({ type: Types.ObjectId })
  refId?: Types.ObjectId;

  @Prop()
  note?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const WalletLedgerSchema = SchemaFactory.createForClass(WalletLedger);
WalletLedgerSchema.index({ userId: 1, createdAt: -1 });
WalletLedgerSchema.index({ userId: 1, type: 1, source: 1, refId: 1 }, { unique: true, sparse: true });