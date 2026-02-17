import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}


export enum NotificationType {
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  FRIEND_REQUEST_ACCEPTED = 'FRIEND_REQUEST_ACCEPTED',
  FRIEND_REQUEST_REJECTED = 'FRIEND_REQUEST_REJECTED', // opcional
  GROUP_INVITE = 'GROUP_INVITE',
  GROUP_JOIN_ACCEPTED = 'GROUP_JOIN_ACCEPTED',
  NEW_COMMENT = 'NEW_COMMENT',
}


@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId; // destinatario

  @Prop({ required: true, enum: NotificationType, index: true })
  type: NotificationType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  body: string;

  @Prop({ type: Object, default: {} })
  payload: any; // ej: { friendshipId, requesterId }

  @Prop({ required: true, enum: NotificationStatus, default: NotificationStatus.UNREAD, index: true })
  status: NotificationStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
