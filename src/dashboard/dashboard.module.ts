import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { OpenAiService } from '../ai/openai.service';
import { DashboardPromptTemplate, DashboardPromptTemplateSchema } from './schemas/dashboard-prompt-template.schema';
import { DashboardDailyMessagesCache, DashboardDailyMessagesCacheSchema } from './schemas/dashboard-daily-messages-cache.schema';
import { DashboardWeeklyImageCache, DashboardWeeklyImageCacheSchema } from './schemas/dashboard-weekly-image-cache.schema';
import { QuizSubmission, QuizSubmissionSchema } from 'src/challenges/schemas/quiz-submission.schema';
import { ChallengeInstance, ChallengeInstanceSchema } from 'src/challenges/schemas/challenge-instance.schema';
import { WalletLedger, WalletLedgerSchema } from 'src/wallet/schemas/wallet-ledger.schema';
import { SustainabilityModule } from '../sustainability/sustainability.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DashboardPromptTemplate.name, schema: DashboardPromptTemplateSchema },
      { name: DashboardDailyMessagesCache.name, schema: DashboardDailyMessagesCacheSchema },
      { name: DashboardWeeklyImageCache.name, schema: DashboardWeeklyImageCacheSchema },
      { name: QuizSubmission.name, schema: QuizSubmissionSchema },
      { name: ChallengeInstance.name, schema: ChallengeInstanceSchema },
      { name: WalletLedger.name, schema: WalletLedgerSchema },        
    ]),
    SustainabilityModule    
  ],
  controllers: [DashboardController],
  providers: [DashboardService, OpenAiService],
})
export class DashboardModule {}