import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { EcoGroup, EcoGroupSchema } from './schemas/eco-group.schema';
import { EcoGroupMember, EcoGroupMemberSchema } from './schemas/eco-group-member.schema';
import { EcoGroupInvite, EcoGroupInviteSchema } from './schemas/eco-group-invite.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { GroupPointsEvent, GroupPointsEventSchema } from './schemas/group-points-event.schema';
import { UserStreak, UserStreakSchema } from '../streak/schemas/user-streak.schema';

import { GroupsExtrasController } from './groups-extras.controller';
import { GroupProgressService } from './group-progress.service';
import { GroupWeeklyProgress, GroupWeeklyProgressSchema } from './schemas/group-weekly-progress.schema';
import { EcoNeighborhoodAsset, EcoNeighborhoodAssetSchema } from './schemas/eco-neighborhood-asset.schema';



@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EcoGroup.name, schema: EcoGroupSchema },
      { name: EcoGroupMember.name, schema: EcoGroupMemberSchema },
      { name: EcoGroupInvite.name, schema: EcoGroupInviteSchema },      
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: GroupPointsEvent.name, schema: GroupPointsEventSchema },
      { name: UserStreak.name, schema: UserStreakSchema },
      { name: GroupWeeklyProgress.name, schema: GroupWeeklyProgressSchema },
      { name: EcoNeighborhoodAsset.name, schema: EcoNeighborhoodAssetSchema },
    ]),
  ],    
  controllers: [GroupsController, GroupsExtrasController],
  providers: [GroupsService, GroupProgressService],
  exports: [GroupsService, MongooseModule, GroupProgressService],
})
export class GroupsModule {}
