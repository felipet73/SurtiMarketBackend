import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StreakController } from './streak.controller';
import { StreakService } from './streak.service';
import { UserStreak, UserStreakSchema } from './schemas/user-streak.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserStreak.name, schema: UserStreakSchema }]),
  ],
  controllers: [StreakController],
  providers: [StreakService],
  exports: [StreakService],
})
export class StreakModule {}