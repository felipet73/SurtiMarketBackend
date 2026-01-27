import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { Challenge, ChallengeSchema } from './schemas/challenge.schema';
import { UserChallenge, UserChallengeSchema } from './schemas/user-challenge.schema';
import { WalletModule } from '../wallet/wallet.module';

import { WeeklyAssignment, WeeklyAssignmentSchema } from './schemas/weekly-assignment.schema';
import { SustainabilityModule } from '../sustainability/sustainability.module';

import { ChallengeTemplate, ChallengeTemplateSchema } from './schemas/challenge-template.schema';
import { ChallengeInstance, ChallengeInstanceSchema } from './schemas/challenge-instance.schema';
import { QuizGeneratorService } from './quiz-generator.service';
import { OpenAiService } from '../ai/openai.service';

import { QuizSubmission, QuizSubmissionSchema } from './schemas/quiz-submission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Challenge.name, schema: ChallengeSchema },
      { name: UserChallenge.name, schema: UserChallengeSchema },
      { name: WeeklyAssignment.name, schema: WeeklyAssignmentSchema },
      { name: ChallengeTemplate.name, schema: ChallengeTemplateSchema },
      { name: ChallengeInstance.name, schema: ChallengeInstanceSchema },      
      { name: QuizSubmission.name, schema: QuizSubmissionSchema },
    ]),
    WalletModule,
    SustainabilityModule,
  ],
  controllers: [ChallengesController],
  providers: [ChallengesService, QuizGeneratorService, OpenAiService],
})
export class ChallengesModule {}
