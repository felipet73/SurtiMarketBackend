import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DashboardPromptTemplate, DashboardPromptTemplateDocument } from './schemas/dashboard-prompt-template.schema';
import { DashboardDailyMessagesCache, DashboardDailyMessagesCacheDocument } from './schemas/dashboard-daily-messages-cache.schema';
import { DashboardWeeklyImageCache, DashboardWeeklyImageCacheDocument } from './schemas/dashboard-weekly-image-cache.schema';
import { OpenAiService } from '../ai/openai.service';
import { getDateKeyLocal } from '../common/utils/date-key';
import { getISOWeekKey } from '../common/utils/week-key';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(DashboardPromptTemplate.name) private tplModel: Model<DashboardPromptTemplateDocument>,
    @InjectModel(DashboardDailyMessagesCache.name) private dailyModel: Model<DashboardDailyMessagesCacheDocument>,
    @InjectModel(DashboardWeeklyImageCache.name) private weeklyImgModel: Model<DashboardWeeklyImageCacheDocument>,
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
}