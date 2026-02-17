import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CommentDocument = HydratedDocument<Comment>;

export enum CommentChannel {
  USER = 'USER',
  GROUP = 'GROUP',
}

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  recipientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  groupId?: Types.ObjectId;

  @Prop({ required: true, enum: CommentChannel, index: true })
  channel: CommentChannel;

  @Prop({ required: true, trim: true, maxlength: 1000 })
  text: string;

  createdAt: Date;
  updatedAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
CommentSchema.index({ recipientId: 1, createdAt: -1 });
