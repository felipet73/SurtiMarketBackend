import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ChallengeTemplate, ChallengeTemplateSchema } from '../challenges/schemas/challenge-template.schema';
import {
  DashboardPromptTemplate,
  DashboardPromptTemplateSchema,
} from '../dashboard/schemas/dashboard-prompt-template.schema';
import { AdminPromptsController } from './admin-prompts.controller';
import { AdminPromptsService } from './admin-prompts.service';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: ChallengeTemplate.name, schema: ChallengeTemplateSchema },
      { name: DashboardPromptTemplate.name, schema: DashboardPromptTemplateSchema },
    ]),
  ],
  controllers: [AdminController, AdminPromptsController],
  providers: [AdminPromptsService],
})
export class AdminModule {}
