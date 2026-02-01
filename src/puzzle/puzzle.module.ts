import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PuzzleController } from './puzzle.controller';
import { PuzzleService } from './puzzle.service';
import { PuzzleWeeklyCache, PuzzleWeeklyCacheSchema } from './schemas/puzzle-weekly-cache.schema';
import { UserWeeklyPuzzleProgress, UserWeeklyPuzzleProgressSchema } from './schemas/user-weekly-puzzle-progress.schema';
import { WalletLedger, WalletLedgerSchema } from '../wallet/schemas/wallet-ledger.schema';
import { OpenAiService } from '../ai/openai.service';
import { OpenAiModule } from '../ai/openai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PuzzleWeeklyCache.name, schema: PuzzleWeeklyCacheSchema },
      { name: UserWeeklyPuzzleProgress.name, schema: UserWeeklyPuzzleProgressSchema },
      { name: WalletLedger.name, schema: WalletLedgerSchema },
    ]),
    OpenAiModule,
  ],
  controllers: [PuzzleController],
  providers: [PuzzleService, OpenAiService],
  exports: [PuzzleService],
})
export class PuzzleModule {}