import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { OpenAiService } from '../ai/openai.service';
import { DashboardPromptTemplate, DashboardPromptTemplateSchema } from './schemas/dashboard-prompt-template.schema';
import { DashboardDailyMessagesCache, DashboardDailyMessagesCacheSchema } from './schemas/dashboard-daily-messages-cache.schema';
import { DashboardWeeklyImageCache, DashboardWeeklyImageCacheSchema } from './schemas/dashboard-weekly-image-cache.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DashboardPromptTemplate.name, schema: DashboardPromptTemplateSchema },
      { name: DashboardDailyMessagesCache.name, schema: DashboardDailyMessagesCacheSchema },
      { name: DashboardWeeklyImageCache.name, schema: DashboardWeeklyImageCacheSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, OpenAiService],
})
export class DashboardModule {}