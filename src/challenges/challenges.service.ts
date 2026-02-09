import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Challenge, ChallengeDocument } from './schemas/challenge.schema';
import { UserChallenge, UserChallengeDocument, UserChallengeStatus } from './schemas/user-challenge.schema';
import { WalletService } from '../wallet/wallet.service';

import { WeeklyAssignment, WeeklyAssignmentDocument } from './schemas/weekly-assignment.schema';
import { SustainabilityService } from '../sustainability/sustainability.service';
import { getISOWeekKey } from '../common/utils/week-key';

import { QuizGeneratorService } from './quiz-generator.service';

import { ChallengeInstance, ChallengeInstanceDocument } from './schemas/challenge-instance.schema';
import { ChallengeTemplate, ChallengeTemplateDocument } from './schemas/challenge-template.schema';
import { QuizSubmission, QuizSubmissionDocument } from './schemas/quiz-submission.schema';

import { GroupProgressService } from '../groups/group-progress.service';
import { EcoGroupMember, EcoGroupMemberDocument, MemberStatus } from '../groups/schemas/eco-group-member.schema';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectModel(Challenge.name) private challengeModel: Model<ChallengeDocument>,
    @InjectModel(UserChallenge.name) private userChallengeModel: Model<UserChallengeDocument>,
    @InjectModel(WeeklyAssignment.name) private weeklyModel: Model<WeeklyAssignmentDocument>,
    @InjectModel(ChallengeInstance.name) private instModel: Model<ChallengeInstanceDocument>,
    @InjectModel(ChallengeTemplate.name) private tplModel: Model<ChallengeTemplateDocument>,
    @InjectModel(QuizSubmission.name) private subModel: Model<QuizSubmissionDocument>,
    @InjectModel(EcoGroupMember.name) private memberModel: Model<EcoGroupMemberDocument>,
    private readonly walletService: WalletService,
    private readonly sustainabilityService: SustainabilityService,    
    private readonly quizGen: QuizGeneratorService,
    private readonly groupProgressService: GroupProgressService,
  ) {}

  private now() {
    return new Date();
  }

  async listActive() {
    const now = this.now();
    return this.challengeModel
      .find({
        isActive: true,
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gte: now } }] },
        ],
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async completeChallenge(userId: string, challengeId: string) {
    const uid = new Types.ObjectId(userId);
    const cid = new Types.ObjectId(challengeId);

    const challenge = await this.challengeModel.findById(cid).exec();
    if (!challenge || !challenge.isActive) throw new NotFoundException('Reto no disponible');

    const now = this.now();
    if (challenge.startsAt && challenge.startsAt > now) throw new BadRequestException('Reto aún no inicia');
    if (challenge.endsAt && challenge.endsAt < now) throw new BadRequestException('Reto ya finalizó');

    // Upsert de relación usuario-reto (idempotente)
    const uc = await this.userChallengeModel
      .findOneAndUpdate(
        { userId: uid, challengeId: cid },
        { $setOnInsert: { status: UserChallengeStatus.STARTED, rewardGranted: false } },
        { new: true, upsert: true },
      )
      .exec();

    // Si ya cobró, devuelve idempotente
    if (uc.status === UserChallengeStatus.COMPLETED && uc.rewardGranted) {
      await this.awardGroupPointsForChallenge({ userId, challenge, challengeId: cid });
      const wallet = await this.walletService.getOrCreate(userId);
      return { status: 'already_completed', ecoCoinsBalance: wallet.ecoCoinsBalance };
    }

    // Marcar completado
    uc.status = UserChallengeStatus.COMPLETED;
    uc.completedAt = now;
    await uc.save();

    // Acreditar EcoCoins (refId = challengeId para idempotencia)
    await this.walletService.earnEcoCoins({
      userId,
      amount: challenge.rewardEcoCoins,
      source: 'CHALLENGE',
      refId: challengeId,
      note: `Reto completado: ${challenge.title}`,
    });

    let profileUpdate: any = null;
    if (challenge.focusDimension) {
      profileUpdate = await this.sustainabilityService.applyWeeklyImprovement({
        userId,
        dimension: challenge.focusDimension,
        reasonRefId: challengeId,
      });
    }
    // Marcar que se otorgó recompensa
    uc.rewardGranted = true;
    await uc.save();    

    await this.awardGroupPointsForChallenge({ userId, challenge, challengeId: cid });

    const wallet = await this.walletService.getOrCreate(userId);
    return { status: 'completed', rewardEcoCoins: challenge.rewardEcoCoins, ecoCoinsBalance: wallet.ecoCoinsBalance, profileUpdate };
  }

  async getWeeklyChallengeForUser(userId: string) {
    const weekKey = getISOWeekKey(new Date());
    const uid = new Types.ObjectId(userId);

    // 1) Si ya está asignado esta semana, devolverlo
    const existing = await this.weeklyModel.findOne({ userId: uid, weekKey }).exec();
    if (existing) {
      const challenge = await this.challengeModel.findById(existing.challengeId).exec();
      return { weekKey, focusDimension: existing.focusDimension, challenge };
    }

    // 2) Determinar dimensión más baja
    const { focusDimension, focusScore } = await this.sustainabilityService.getLowestDimension(userId);

    // 3) Seleccionar un challenge WEEKLY con ese foco
    // Recomendación: mantener un “pool” de retos por dimensión en DB
    const candidates = await this.challengeModel
      .find({ isActive: true, type: 'WEEKLY', focusDimension })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();

    if (!candidates.length) {
      // fallback: cualquier weekly activo
      const anyWeekly = await this.challengeModel.findOne({ isActive: true, type: 'WEEKLY' }).sort({ createdAt: -1 }).exec();
      if (!anyWeekly) throw new NotFoundException('No hay retos semanales disponibles');
      const createdFallback = await this.weeklyModel.create({
        userId: uid,
        weekKey,
        focusDimension,
        challengeId: anyWeekly._id,
      });
      return { weekKey, focusDimension, focusScore, challenge: anyWeekly };
    }

    // 4) Selección determinística simple (para repartir)
    // Usa hash básico a partir de userId + weekKey para elegir índice estable
    const key = `${userId}-${weekKey}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    const pick = candidates[hash % candidates.length];

    // 5) Crear assignment (idempotente por índice único)
    const assignment = await this.weeklyModel.create({
      userId: uid,
      weekKey,
      focusDimension,
      challengeId: pick._id,
    });

    return { weekKey, focusDimension, focusScore, challenge: pick };
  }

  async getWeeklyQuizForUser(userId: string) {
    const uid = new Types.ObjectId(userId);
    
    // 1) dimensión más baja del perfil
    
     // 1) Dimensión más baja
      const { focusDimension, focusScore } =
        await this.sustainabilityService.getLowestDimension(userId);

      // 2) Generar / obtener instancia weekly
      const instance =
        await this.quizGen.generateWeeklyQuizInstance({ focusDimension });

      // 3) Buscar submission del usuario (si existe)
      const submission = await this.subModel
        .findOne({ userId: uid, instanceId: instance._id })
        .exec();
    

      const submissionStatus = submission
      ? {
          hasSubmitted: true,
          passed: submission.passed,
          scorePercent: submission.scorePercent,
          correctCount: submission.correctCount,
          rewardGranted: submission.rewardGranted,
          ecoCoinsGranted: submission.ecoCoinsGranted ?? 0,
        }
      : {
          hasSubmitted: false,
          passed: false,
          scorePercent: null,
          correctCount: null,
          rewardGranted: false,
          ecoCoinsGranted: 0,
        };

    return {
      focusDimension,
      focusScore,
      submissionStatus,
      instance: {
        id: instance._id,
        weekKey: instance.weekKey,
        templateKey: instance.templateKey,
        focusDimension: instance.focusDimension,
        rewardEcoCoins: instance.payload?.ecoCoinsReward,
        cardImage: instance.cardImage,
        payload: instance.payload,
      },
    };
  }

  async submitWeeklyQuiz(userId: string, instanceId: string, answers: number[]) {
    const uid = new Types.ObjectId(userId);
    const iid = new Types.ObjectId(instanceId);

    const instance = await this.instModel.findById(iid).exec();
    if (!instance) throw new NotFoundException('ChallengeInstance no existe');

    if (instance.gameType !== 'QUIZ') throw new BadRequestException('Instance no es QUIZ');
    if (!instance.payload?.questions?.length) throw new BadRequestException('Instance sin preguntas');

    const questions = instance.payload.questions as Array<{ answerIndex: number }>;
    const total = questions.length;

    if (!Array.isArray(answers) || answers.length !== total) {
      throw new BadRequestException(`answers debe tener longitud ${total}`);
    }

    // Calcular score
    let correct = 0;
    for (let i = 0; i < total; i++) {
      if (answers[i] === questions[i].answerIndex) correct++;
    }

    const scorePercent = Math.round((correct / total) * 100);
    const passed = scorePercent >= 70;

    // Idempotencia: si ya existe submission user+instance => devolver y no volver a pagar
    const existing = await this.subModel.findOne({ userId: uid, instanceId: iid }).exec();
    if (existing) {
      if (existing.passed) {
        await this.groupProgressService.addPoints({
          userId,
          points: 40,
          eventKey: `QUIZ_PASS:${instance.weekKey}:${userId}`,
          source: 'QUIZ_PASS',
          weekKey: undefined,
        });

        await this.groupProgressService.onMemberWeeklyQuizPassed({
          userId,
          dimension: instance.focusDimension,
        });
      }

      if (existing.passed && !existing.rewardGranted) {
        let reward = Number(instance.payload?.ecoCoinsReward);
        if (!Number.isFinite(reward) || reward < 0) {
          const tpl = await this.tplModel.findById(instance.templateId).exec();
          reward = tpl?.rewardEcoCoins ?? 0;
        }

        await this.walletService.earnEcoCoins({
          userId,
          amount: reward,
          source: 'WEEKLY_QUIZ',
          refId: instanceId,
          note: `Quiz semanal aprobado (${instance.focusDimension})`,
        });

        const profileUpdate = await this.sustainabilityService.applyWeeklyImprovement({
          userId,
          dimension: instance.focusDimension,
          reasonRefId: instanceId,
        });

        await this.groupProgressService.onMemberWeeklyQuizPassed({
          userId,
          dimension: instance.focusDimension,
        });

        existing.rewardGranted = true;
        existing.ecoCoinsGranted = reward;
        await existing.save();

        const wallet = await this.walletService.getOrCreate(userId);

        return {
          idempotent: true,
          passed: existing.passed,
          correctCount: existing.correctCount,
          totalQuestions: existing.totalQuestions,
          scorePercent: existing.scorePercent,
          ecoCoinsGranted: reward,
          rewardGranted: true,
          ecoCoinsBalance: wallet.ecoCoinsBalance,
          profileUpdate,
        };
      }

      if (!existing.passed) {
        await this.groupProgressService.addPoints({
          userId,
          points: 10,
          eventKey: `QUIZ_FAIL:${instance.weekKey}:${userId}`,
          source: 'QUIZ_FAIL',
          weekKey: undefined,
        });
      }

      return {
        idempotent: true,
        passed: existing.passed,
        correctCount: existing.correctCount,
        totalQuestions: existing.totalQuestions,
        scorePercent: existing.scorePercent,
        ecoCoinsGranted: existing.ecoCoinsGranted ?? 0,
        rewardGranted: existing.rewardGranted,
      };
    }

    // Crear submission (aún sin recompensa)
    const created = await this.subModel.create({
      userId: uid,
      instanceId: iid,
      answers,
      totalQuestions: total,
      correctCount: correct,
      scorePercent,
      passed,
      rewardGranted: false,
      ecoCoinsGranted: 0,
    });

    // Si no pasó, no otorgar nada
    if (!passed) {
      await this.groupProgressService.addPoints({
        userId,
        points: 10,
        eventKey: `QUIZ_FAIL:${instance.weekKey}:${userId}`,
        source: 'QUIZ_FAIL',
        weekKey: undefined,
      });
      return {
        idempotent: false,
        passed,
        correctCount: correct,
        totalQuestions: total,
        scorePercent,
        ecoCoinsGranted: 0,
        rewardGranted: false,
      };
    }

    // Determinar recompensa (payload ecoCoinsReward o template.rewardEcoCoins)
    let reward = Number(instance.payload?.ecoCoinsReward);
    if (!Number.isFinite(reward) || reward < 0) {
      const tpl = await this.tplModel.findById(instance.templateId).exec();
      reward = tpl?.rewardEcoCoins ?? 0;
    }

    // Acreditar EcoCoins (refId = instanceId para idempotencia de ledger)
    await this.walletService.earnEcoCoins({
      userId,
      amount: reward,
      source: 'WEEKLY_QUIZ',
      refId: instanceId,
      note: `Quiz semanal aprobado (${instance.focusDimension})`,
    });

    // Mejorar perfil sostenible (+1 en dimensión del reto)
    const profileUpdate = await this.sustainabilityService.applyWeeklyImprovement({
      userId,
      dimension: instance.focusDimension,
      reasonRefId: instanceId,
    });

    await this.groupProgressService.onMemberWeeklyQuizPassed({
      userId,
      dimension: instance.focusDimension,
    });
    // Marcar rewardGranted
    created.rewardGranted = true;
    created.ecoCoinsGranted = reward;
    await created.save();

    const wallet = await this.walletService.getOrCreate(userId);

    await this.groupProgressService.addPoints({
      userId,
      points: 40,
      eventKey: `QUIZ_PASS:${instance.weekKey}:${userId}`,
      source: 'QUIZ_PASS',
      weekKey: undefined,
    });

    return {
      idempotent: false,
      passed,
      correctCount: correct,
      totalQuestions: total,
      scorePercent,
      ecoCoinsGranted: reward,
      rewardGranted: true,
      ecoCoinsBalance: wallet.ecoCoinsBalance,
      profileUpdate,
    };
  }

  private async awardGroupPointsForChallenge(params: {
    userId: string;
    challenge: ChallengeDocument;
    challengeId: Types.ObjectId;
  }) {
    const challengeKey = `${params.challengeId.toString()}:${params.userId}`;

    if (params.challenge.isGroup) {
      await this.groupProgressService.addPoints({
        userId: params.userId,
        points: 10,
        eventKey: `CHALLENGE_GROUP_MEMBER:${challengeKey}`,
        source: 'CHALLENGE_GROUP_MEMBER',
      });

      const membership = await this.memberModel
        .findOne({ userId: new Types.ObjectId(params.userId), status: MemberStatus.ACTIVE })
        .lean()
        .exec();
      if (membership) {
        const members = await this.memberModel
          .find({ groupId: membership.groupId, status: MemberStatus.ACTIVE })
          .select('userId')
          .lean()
          .exec();
        const memberIds = members.map((m) => m.userId);
        const completed = await this.userChallengeModel.countDocuments({
          challengeId: params.challengeId,
          userId: { $in: memberIds },
          status: UserChallengeStatus.COMPLETED,
        });
        const target = Math.max(2, Math.ceil((members.length || 1) * 0.6));
        if (completed >= target) {
          await this.groupProgressService.addPoints({
            userId: params.userId,
            points: 60,
            eventKey: `CHALLENGE_GROUP_BONUS:${params.challengeId.toString()}:${membership.groupId.toString()}`,
            source: 'CHALLENGE_GROUP_BONUS',
          });
        }
      }
    } else {
      await this.groupProgressService.addPoints({
        userId: params.userId,
        points: 20,
        eventKey: `CHALLENGE:${challengeKey}`,
        source: 'CHALLENGE',
      });
    }
  }
}
