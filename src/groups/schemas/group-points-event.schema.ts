import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GroupPointsEventDocument = HydratedDocument<GroupPointsEvent>;

@Schema({ timestamps: true, collection: 'group_points_events' })
export class GroupPointsEvent {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  weekKey: string;

  @Prop()
  dateKey?: string;

  @Prop({ required: true })
  eventKey: string;

  @Prop({ required: true })
  points: number;

  @Prop({ required: true, trim: true })
  source: string;

  createdAt: Date;
  updatedAt: Date;
}

export const GroupPointsEventSchema = SchemaFactory.createForClass(GroupPointsEvent);
GroupPointsEventSchema.index({ groupId: 1, eventKey: 1 }, { unique: true });
