import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Challenge, ChallengeDocument } from './schemas/challenge.schema';
import { UserChallenge, UserChallengeDocument, UserChallengeStatus } from './schemas/user-challenge.schema';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectModel(Challenge.name) private challengeModel: Model<ChallengeDocument>,
    @InjectModel(UserChallenge.name) private userChallengeModel: Model<UserChallengeDocument>,
    private readonly walletService: WalletService,
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

    // Marcar que se otorgó recompensa
    uc.rewardGranted = true;
    await uc.save();

    const wallet = await this.walletService.getOrCreate(userId);
    return { status: 'completed', rewardEcoCoins: challenge.rewardEcoCoins, ecoCoinsBalance: wallet.ecoCoinsBalance };
  }
}