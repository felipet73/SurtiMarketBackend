import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EcoGroupMemberDocument = HydratedDocument<EcoGroupMember>;

export enum GroupRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  LEFT = 'LEFT',
  REJECTED = 'REJECTED',
  KICKED = 'KICKED',
}

@Schema({ timestamps: true })
export class EcoGroupMember {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ enum: GroupRole, default: GroupRole.MEMBER })
  role: GroupRole;

  @Prop({ enum: MemberStatus, default: MemberStatus.PENDING, index: true })
  status: MemberStatus;

  @Prop()
  joinedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const EcoGroupMemberSchema = SchemaFactory.createForClass(EcoGroupMember);

// 1 solicitud/relación por user+group
EcoGroupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });

// "1 grupo activo por usuario" (crítico)
// Esto no se puede indexar condicional simple; lo hacemos en lógica + índice auxiliar:
EcoGroupMemberSchema.index({ userId: 1, status: 1, createdAt: -1 });