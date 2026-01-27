import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChallengeTemplate, ChallengeTemplateDocument } from './schemas/challenge-template.schema';
import { ChallengeInstance, ChallengeInstanceDocument } from './schemas/challenge-instance.schema';
import { OpenAiService } from '../ai/openai.service';
import { getISOWeekKey } from '../common/utils/week-key';

@Injectable()
export class QuizGeneratorService {
  constructor(
    @InjectModel(ChallengeTemplate.name) private tplModel: Model<ChallengeTemplateDocument>,
    @InjectModel(ChallengeInstance.name) private instModel: Model<ChallengeInstanceDocument>,
    private readonly openai: OpenAiService,
  ) {}

  async generateWeeklyQuizInstance(params: { focusDimension: any; locale?: string }) {
    const weekKey = getISOWeekKey(new Date());

    const tpl = await this.tplModel.findOne({
      isActive: true,
      cadence: 'WEEKLY',
      gameType: 'QUIZ',
      focusDimension: params.focusDimension,
    }).sort({ updatedAt: -1 }).exec();

    if (!tpl) throw new NotFoundException(`No hay ChallengeTemplate QUIZ WEEKLY para ${params.focusDimension}`);

    // idempotencia: si ya existe la instancia de ese template para esta semana, devolver
    const existing = await this.instModel.findOne({ templateId: tpl._id, weekKey }).exec();
    if (existing) return existing;

    // Construir userPrompt final (template configurable + variables)
    const filledUserPrompt =
      `${tpl.userPrompt}\n\n` +
      `Restricciones:\n` +
      `- Locale: ${tpl.locale}\n` +
      `- Dimensión foco: ${tpl.focusDimension}\n` +
      `- Número de preguntas: ${tpl.numQuestions}\n` +
      `- No repitas preguntas.\n` +
      `- Respuestas claras, educativas y accionables.\n`;

    const payload = await this.openai.generateJsonStructured({
      systemPrompt: tpl.systemPrompt,
      userPrompt: filledUserPrompt,
      jsonSchema: tpl.jsonSchema,
      temperature: tpl.temperature,
    });

    const cardPrompt =
      `${tpl.cardImagePrompt}\n` +
      `Tema: sostenibilidad / ${tpl.focusDimension}. ` +
      `Sin texto, sin logos, estilo flat moderno, imagen tipo tarjeta para app.`;

    const cardImage = await this.openai.generateCardImage({ prompt: cardPrompt });

    try {
      const created = await this.instModel.create({
        templateId: tpl._id,
        templateKey: tpl.key,
        cadence: tpl.cadence,
        gameType: tpl.gameType,
        focusDimension: tpl.focusDimension,
        weekKey,
        payload,
        cardImage,
        isPublished: true,
      });
      return created;
    } catch (err: any) {
      // Si otro request creó la instancia al mismo tiempo, devolvemos la existente
      if (err?.code === 11000) {
        const existingAfter = await this.instModel.findOne({ templateId: tpl._id, weekKey }).exec();
        if (existingAfter) return existingAfter;
      }
      throw err;
    }
  }
}