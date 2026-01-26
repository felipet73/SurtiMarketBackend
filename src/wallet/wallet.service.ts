import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { WalletLedger, WalletLedgerDocument, LedgerType } from './schemas/wallet-ledger.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(WalletLedger.name) private ledgerModel: Model<WalletLedgerDocument>,
  ) {}

  async getOrCreate(userId: string) {
    const uid = new Types.ObjectId(userId);
    let wallet = await this.walletModel.findOne({ userId: uid }).exec();
    if (!wallet) wallet = await this.walletModel.create({ userId: uid, ecoCoinsBalance: 0 });
    return wallet;
  }

  async getMyWallet(userId: string) {
    const wallet = await this.getOrCreate(userId);

    const lastMovements = await this.ledgerModel
      .find({ userId: wallet.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();

    return {
      ecoCoinsBalance: wallet.ecoCoinsBalance,
      lastMovements,
    };
  }

  /**
   * Descuento atómico: solo descuenta si hay saldo suficiente.
   * Retorna el balance luego del descuento.
   */
  async spendEcoCoinsAtomic(params: {
    userId: string;
    amount: number;
    source: string;
    refId?: string;
    note?: string;
  }) {
    if (params.amount <= 0) return { ecoCoinsBalance: undefined };

    const uid = new Types.ObjectId(params.userId);

    const updated = await this.walletModel
      .findOneAndUpdate(
        { userId: uid, ecoCoinsBalance: { $gte: params.amount } },
        { $inc: { ecoCoinsBalance: -params.amount } },
        { new: true, upsert: true }, // si no existe, lo crea con balance 0, pero NO pasará $gte si amount>0
      )
      .exec();

    if (!updated || updated.ecoCoinsBalance < 0) {
      throw new BadRequestException('EcoCoins insuficientes');
    }

    await this.ledgerModel.create({
      userId: uid,
      type: LedgerType.SPEND,
      amount: params.amount,
      source: params.source,
      refId: params.refId ? new Types.ObjectId(params.refId) : undefined,
      note: params.note,
    });

    return { ecoCoinsBalance: updated.ecoCoinsBalance };
  }

  // Útil para pruebas / admin / retos (puedes protegerlo luego)
  async earnEcoCoins(params: { userId: string; amount: number; source: string; refId?: string; note?: string }) {
    if (params.amount <= 0) throw new BadRequestException('amount inválido');

    const uid = new Types.ObjectId(params.userId);

    const updated = await this.walletModel
      .findOneAndUpdate(
        { userId: uid },
        { $inc: { ecoCoinsBalance: params.amount } },
        { new: true, upsert: true },
      )
      .exec();

    if (!updated) throw new NotFoundException('Wallet no encontrada');

    await this.ledgerModel.create({
      userId: uid,
      type: LedgerType.EARN,
      amount: params.amount,
      source: params.source,
      refId: params.refId ? new Types.ObjectId(params.refId) : undefined,
      note: params.note,
    });

    return { ecoCoinsBalance: updated.ecoCoinsBalance };
  }
}