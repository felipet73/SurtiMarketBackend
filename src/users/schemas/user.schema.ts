import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

export type UserDocument = HydratedDocument<User>;


@Schema({ _id: false })
class PrivacySettings {
  @Prop({ enum: ['PUBLIC','COMMUNITY','GROUP_ONLY','PRIVATE'], default: 'COMMUNITY' })
  profileVisibility: 'PUBLIC' | 'COMMUNITY' | 'GROUP_ONLY' | 'PRIVATE';

  @Prop({ default: true })
  emailSearchable: boolean;

  @Prop({ enum: ['ANYONE','FRIENDS_OF_FRIENDS','NOBODY'], default: 'ANYONE' })
  friendRequests: 'ANYONE' | 'FRIENDS_OF_FRIENDS' | 'NOBODY';
}
const PrivacySettingsSchema = SchemaFactory.createForClass(PrivacySettings);

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, unique: true, index: true, trim: true })
  username: string;

  @Prop({ trim: true })
  displayName?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: [String], enum: Role, default: [Role.CLIENT] })
  roles: Role[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: PrivacySettingsSchema, default: {} })
  privacy: PrivacySettings;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true });