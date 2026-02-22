import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UserStreak, UserStreakSchema } from '../streak/schemas/user-streak.schema';
import { QuizSubmission, QuizSubmissionSchema } from '../challenges/schemas/quiz-submission.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Wallet, WalletSchema } from '../wallet/schemas/wallet.schema';
import { WalletLedger, WalletLedgerSchema } from '../wallet/schemas/wallet-ledger.schema';
import { EcoImpactWeek, EcoImpactWeekSchema } from '../ecoimpact/schemas/ecoimpact-week.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserStreak.name, schema: UserStreakSchema },
      { name: QuizSubmission.name, schema: QuizSubmissionSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletLedger.name, schema: WalletLedgerSchema },
      { name: EcoImpactWeek.name, schema: EcoImpactWeekSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
