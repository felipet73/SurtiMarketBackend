import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DashboardPromptTemplate, DashboardPromptTemplateDocument } from './schemas/dashboard-prompt-template.schema';
import { DashboardDailyMessagesCache, DashboardDailyMessagesCacheDocument } from './schemas/dashboard-daily-messages-cache.schema';
import { DashboardWeeklyImageCache, DashboardWeeklyImageCacheDocument } from './schemas/dashboard-weekly-image-cache.schema';
import { OpenAiService } from '../ai/openai.service';
import { getDateKeyLocal } from '../common/utils/date-key';
import { getISOWeekKey } from '../common/utils/week-key';

import { getISOWeekRange } from '../common/utils/iso-week-range';
import { SustainabilityService } from '../sustainability/sustainability.service';
import { QuizSubmission, QuizSubmissionDocument } from '../challenges/schemas/quiz-submission.schema';
import { ChallengeInstance, ChallengeInstanceDocument } from '../challenges/schemas/challenge-instance.schema';

import { WalletLedger, WalletLedgerDocument, LedgerType } from '../wallet/schemas/wallet-ledger.schema';


@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(DashboardPromptTemplate.name) private tplModel: Model<DashboardPromptTemplateDocument>,
    @InjectModel(DashboardDailyMessagesCache.name) private dailyModel: Model<DashboardDailyMessagesCacheDocument>,
    @InjectModel(DashboardWeeklyImageCache.name) private weeklyImgModel: Model<DashboardWeeklyImageCacheDocument>,
    @InjectModel(QuizSubmission.name) private subModel: Model<QuizSubmissionDocument>,
    @InjectModel(ChallengeInstance.name) private instModel: Model<ChallengeInstanceDocument>,
    @InjectModel(WalletLedger.name) private ledgerModel: Model<WalletLedgerDocument>,
    private readonly sustainabilityService: SustainabilityService,    
    private readonly openai: OpenAiService,
  ) {}

  private async getActiveTemplate() {
    const tpl = await this.tplModel.findOne({ isActive: true }).sort({ updatedAt: -1 }).exec();
    if (!tpl) throw new NotFoundException('No hay DashboardPromptTemplate activo');
    return tpl;
  }

  async getAwarenessSection(userId: string) {
    const tpl = await this.getActiveTemplate();

    // 1) Imagen semanal global
    const weekKey = getISOWeekKey(new Date());
    let weeklyImg = await this.weeklyImgModel.findOne({ weekKey }).exec();

    if (!weeklyImg) {
      const img = await this.openai.generateWeeklyImage({ prompt: tpl.weeklyImagePrompt });
      weeklyImg = await this.weeklyImgModel.create({
        weekKey,
        imageMimeType: img.mimeType,
        imageBase64: img.base64,
      });
    }

    // 2) Mensajes diarios por usuario
    const dateKey = getDateKeyLocal(new Date());
    const uid = new Types.ObjectId(userId);

    let daily = await this.dailyModel.findOne({ userId: uid, dateKey }).exec();
    if (!daily) {
      const out = await this.openai.generateAwarenessMessages({
        systemPrompt: tpl.systemPrompt,
        userPrompt: tpl.userPrompt,
        jsonSchema: tpl.jsonSchema,
      });

      daily = await this.dailyModel.create({
        userId: uid,
        dateKey,
        messages: out.messages,
      });
    }

    return {
      dateKey,
      weekKey,
      image: {
        mimeType: weeklyImg.imageMimeType,
        base64: weeklyImg.imageBase64,
      },
      messages: daily.messages,
    };
  }

  async getWeeklyProgress(userId: string) {
    const weekKey = getISOWeekKey(new Date());
    const { start, end } = getISOWeekRange(new Date());
    const uid = new Types.ObjectId(userId);
    // 1) Perfil actual
    const profile = await this.sustainabilityService.getMyProfile(userId);

    // 2) Weekly quiz instance (la última publicada para esta semana y dimensión más baja)
    // OJO: como tu weekly-quiz/me genera por dimensión más baja, aquí buscamos la instancia
    // para esa dimensión de esta semana.
    const lowest = await this.sustainabilityService.getLowestDimension(userId);

    const instance = await this.instModel.findOne({
      cadence: 'WEEKLY',
      gameType: 'QUIZ',
      weekKey,
      focusDimension: lowest.focusDimension,
      isPublished: true,
    }).exec();

    // 3) Submission status (si existe)
    let submissionStatus = { hasSubmitted: false, passed: false, scorePercent: 0, rewardGranted: false, ecoCoinsGranted: 0 };

    if (instance) {
      const sub = await this.subModel.findOne({ userId: uid, instanceId: instance._id }).exec();
      if (sub) {
        submissionStatus = {
          hasSubmitted: true,
          passed: sub.passed,
          scorePercent: sub.scorePercent ?? 0,
          rewardGranted: sub.rewardGranted,
          ecoCoinsGranted: sub.ecoCoinsGranted ?? 0,
        };
      }
    }

    const earnedAgg = await this.ledgerModel.aggregate([
      {
        $match: {
          userId: uid,
          type: LedgerType.EARN,
          createdAt: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const ecoCoinsEarnedThisWeek = earnedAgg?.[0]?.total ?? 0;

    return {
      weekKey,
      range: { start, end },
      ecoCoinsEarnedThisWeek,
      sustainableProfile: {
        overallScore: profile.overallScore,
        dimensionScores: profile.dimensionScores,
      },
      weeklyQuiz: {
        focusDimension: lowest.focusDimension,
        focusScore: lowest.focusScore,
        instanceId: instance?._id ?? null,
        submissionStatus,
      },
    };
  }

}