import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Dimension, EcoImpactEventType } from '../dto/ecoimpact.dto';

export type EcoImpactEventDocument = HydratedDocument<EcoImpactEvent>;

@Schema({ timestamps: true })
export class EcoImpactEvent {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  weekKey: string;

  @Prop({ required: true, index: true })
  dateKey: string; // YYYY-MM-DD

  @Prop({ required: true, enum: EcoImpactEventType, index: true })
  type: EcoImpactEventType;

  @Prop({ enum: Dimension })
  dimension?: Dimension;

  @Prop()
  delta?: number;

  @Prop()
  sourceId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const EcoImpactEventSchema = SchemaFactory.createForClass(EcoImpactEvent);

EcoImpactEventSchema.index(
  { userId: 1, groupId: 1, weekKey: 1, type: 1, dateKey: 1, sourceId: 1 },
  { unique: true, partialFilterExpression: { sourceId: { $exists: true } } },
);
EcoImpactEventSchema.index(
  { userId: 1, groupId: 1, weekKey: 1, type: 1, dateKey: 1 },
  { unique: true, partialFilterExpression: { sourceId: { $exists: false } } },
);
