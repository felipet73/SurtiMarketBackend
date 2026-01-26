import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DimensionKey,
  SustainabilityProfile,
  SustainabilityProfileDocument,
} from './schemas/sustainability-profile.schema';
import { QUESTIONNAIRE_V1 } from './questionnaire.v1';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class SustainabilityService {
  constructor(
    @InjectModel(SustainabilityProfile.name)
    private profileModel: Model<SustainabilityProfileDocument>,
    private readonly walletService: WalletService,
  ) {}

  getQuestionnaire() {
    return QUESTIONNAIRE_V1;
  }

  private clamp(min: number, max: number, v: number) {
    return Math.max(min, Math.min(max, v));
  }

  private toScore1to10(raw: number, rawMax: number) {
    // score = round( (raw/rawMax)*9 + 1 ), clamp 1..10
    const s = Math.round((raw / rawMax) * 9 + 1);
    return this.clamp(1, 10, s);
  }

  private computeScores(answers: number[]) {
    if (answers.length !== 10) throw new BadRequestException('Se requieren 10 respuestas');

    // Dimensiones: 2 preguntas cada una => rawMaxDim = 8
    const dimRaw: Record<DimensionKey, number> = {
      waste: answers[0] + answers[1],
      transport: answers[2] + answers[3],
      energy: answers[4] + answers[5],
      water: answers[6] + answers[7],
      consumption: answers[8] + answers[9],
    };

    const dimensionScores: Record<DimensionKey, number> = {
      waste: this.toScore1to10(dimRaw.waste, 8),
      transport: this.toScore1to10(dimRaw.transport, 8),
      energy: this.toScore1to10(dimRaw.energy, 8),
      water: this.toScore1to10(dimRaw.water, 8),
      consumption: this.toScore1to10(dimRaw.consumption, 8),
    };

    // Promedio simple sin pesos (redondeado)
    const avg =
      (dimensionScores.waste +
        dimensionScores.transport +
        dimensionScores.energy +
        dimensionScores.water +
        dimensionScores.consumption) /
      5;

    const overallScore = this.clamp(1, 10, Math.round(avg));

    return { overallScore, dimensionScores };
  }

  private computeInitialEcoCoins(overallScore: number) {
    // Regla motivante y estable
    // 200 + (score*50) + ((10-score)*30)
    return 200 + overallScore * 50 + (10 - overallScore) * 30;
  }

  async submitAssessment(userId: string, answers: number[]) {
    const { overallScore, dimensionScores } = this.computeScores(answers);
    const now = new Date();

    const snapshot = {
      version: QUESTIONNAIRE_V1.version,
      submittedAt: now,
      answers,
      overallScore,
      dimensionScores,
    };

    const uid = new Types.ObjectId(userId);
    const existing = await this.profileModel.findOne({ userId: uid }).exec();

    // Si no existe: crear baseline + latest, y acreditar EcoCoins una sola vez
    if (!existing) {
      const initialEcoCoins = this.computeInitialEcoCoins(overallScore);

      const created = await this.profileModel.create({
        userId: uid,
        overallScore,
        dimensionScores,
        baseline: { ...snapshot, ecoCoinsGranted: initialEcoCoins },
        latest: { ...snapshot, ecoCoinsGranted: initialEcoCoins },
      });

      // Acreditar ecoCoins baseline (idempotencia básica: source+refId)
      // refId = userId asegura "solo una vez por usuario" si agregas índice único en ledger luego
      await this.walletService.earnEcoCoins({
        userId,
        amount: initialEcoCoins,
        source: 'SUSTAINABILITY_BASELINE',
        refId: userId,
        note: `Cuestionario inicial v${QUESTIONNAIRE_V1.version} completado`,
      });

      return {
        mode: 'baseline_created',
        overallScore: created.overallScore,
        dimensionScores: created.dimensionScores,
        ecoCoinsGranted: initialEcoCoins,
      };
    }

    // Si existe: actualizar latest (y overall) sin otorgar baseline de nuevo
    existing.overallScore = overallScore;
    existing.dimensionScores = dimensionScores;
    existing.latest = snapshot as any;

    await existing.save();

    return {
      mode: 'updated',
      overallScore: existing.overallScore,
      dimensionScores: existing.dimensionScores,
      ecoCoinsGranted: 0,
    };
  }

  async getMyProfile(userId: string) {
    const uid = new Types.ObjectId(userId);
    const profile = await this.profileModel.findOne({ userId: uid }).exec();
    if (!profile) throw new NotFoundException('Perfil sostenible no creado');

    const baseline = profile.baseline;
    const latest = profile.latest;

    const delta = latest.overallScore - baseline.overallScore;

    return {
      overallScore: profile.overallScore,
      dimensionScores: profile.dimensionScores,
      baseline: {
        overallScore: baseline.overallScore,
        dimensionScores: baseline.dimensionScores,
        submittedAt: baseline.submittedAt,
      },
      latest: {
        overallScore: latest.overallScore,
        dimensionScores: latest.dimensionScores,
        submittedAt: latest.submittedAt,
      },
      progress: {
        deltaOverall: delta,
      },
    };
  }
}
