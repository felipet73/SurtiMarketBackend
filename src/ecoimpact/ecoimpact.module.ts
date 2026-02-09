import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EcoImpactController } from './ecoimpact.controller';
import { EcoImpactService } from './ecoimpact.service';
import { EcoImpactWeek, EcoImpactWeekSchema } from './schemas/ecoimpact-week.schema';
import { EcoImpactEvent, EcoImpactEventSchema } from './schemas/ecoimpact-event.schema';
import { EcoImpactScore, EcoImpactScoreSchema } from './schemas/ecoimpact-score.schema';
import { EcoImpactDailySnapshot, EcoImpactDailySnapshotSchema } from './schemas/ecoimpact-daily.schema';
import { EcoGroupMember, EcoGroupMemberSchema } from '../groups/schemas/eco-group-member.schema';
import { EcoGroup, EcoGroupSchema } from '../groups/schemas/eco-group.schema';
import { GroupPointsEvent, GroupPointsEventSchema } from '../groups/schemas/group-points-event.schema';
import { OpenAiEcoImpactService } from './openai/openai-ecoimpact.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EcoImpactWeek.name, schema: EcoImpactWeekSchema },
      { name: EcoImpactEvent.name, schema: EcoImpactEventSchema },
      { name: EcoImpactScore.name, schema: EcoImpactScoreSchema },
      { name: EcoImpactDailySnapshot.name, schema: EcoImpactDailySnapshotSchema },
      { name: EcoGroupMember.name, schema: EcoGroupMemberSchema },
      { name: EcoGroup.name, schema: EcoGroupSchema },
      { name: GroupPointsEvent.name, schema: GroupPointsEventSchema },
    ]),
  ],
  controllers: [EcoImpactController],
  providers: [EcoImpactService, OpenAiEcoImpactService],
  exports: [EcoImpactService],
})
export class EcoImpactModule {}
