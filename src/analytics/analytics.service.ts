import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AnalyticsDashboardQueryDto } from './dto/analytics-dashboard-query.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UserStreak, UserStreakDocument } from '../streak/schemas/user-streak.schema';
import { QuizSubmission, QuizSubmissionDocument } from '../challenges/schemas/quiz-submission.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import {
  WalletLedger,
  WalletLedgerDocument,
  LedgerType,
} from '../wallet/schemas/wallet-ledger.schema';
import { Wallet, WalletDocument } from '../wallet/schemas/wallet.schema';
import { EcoImpactWeek, EcoImpactWeekDocument } from '../ecoimpact/schemas/ecoimpact-week.schema';

type CountByKeyRow = { _id: string; count: number };
type SumByKeyRow = { _id: string; total: number };
type OrdersTopRow = { _id: Types.ObjectId; count: number };
type WeekMetricsRow = { _id: string; orders: number; avgTicket: number };
type DimensionWeekRow = {
  _id: string;
  waste: number;
  transport: number;
  energy: number;
  water: number;
  consumption: number;
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserStreak.name) private readonly userStreakModel: Model<UserStreakDocument>,
    @InjectModel(QuizSubmission.name) private readonly quizSubmissionModel: Model<QuizSubmissionDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(WalletLedger.name) private readonly walletLedgerModel: Model<WalletLedgerDocument>,
    @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
    @InjectModel(EcoImpactWeek.name) private readonly ecoImpactWeekModel: Model<EcoImpactWeekDocument>,
  ) {}

  async getDashboard(query: AnalyticsDashboardQueryDto) {
    const from = this.normalizeDateOnly(query.from);
    const to = this.normalizeDateOnly(query.to);
    const tz = query.tz?.trim() || 'America/Guayaquil';

    if (from > to) {
      throw new BadRequestException('"from" debe ser menor o igual a "to"');
    }

    const [
      loginsByDay,
      quizzesByDay,
      purchasesByDay,
      ecoCoinsEarnedByDay,
      dimensionWeeklyRows,
      ecoCoinsBreakdown,
      ordersTopCustomers,
      streakDistribution,
      ordersVsTicketWeekly,
    ] = await Promise.all([
      this.aggregateLoginsByDay(from, to),
      this.aggregateQuizCountByDay(from, to, tz),
      this.aggregatePurchasesByDay(from, to, tz),
      this.aggregateEcoCoinsEarnedByDay(from, to, tz),
      this.aggregateDimensionWeekly(from, to, tz),
      this.aggregateEcoCoinsBreakdown(from, to, tz),
      this.aggregateOrdersTopCustomers(from, to, tz),
      this.aggregateStreakDistribution(),
      this.aggregateOrdersVsTicketWeekly(from, to, tz),
    ]);

    const dayLabels = this.buildDateLabels(from, to);
    const loginsMap = this.mapCountRows(loginsByDay);
    const quizzesMap = this.mapCountRows(quizzesByDay);
    const purchasesMap = this.mapCountRows(purchasesByDay);
    const ecoCoinsEarnedMap = this.mapSumRows(ecoCoinsEarnedByDay);

    const dimensionWeeklyLabels = dimensionWeeklyRows
      .map((r) => r._id)
      .sort((a, b) => this.compareWeekKeys(a, b));
    const dimensionRowByWeek = new Map(dimensionWeeklyRows.map((r) => [r._id, r]));

    const ordersVsTicketLabels = ordersVsTicketWeekly
      .map((r) => r._id)
      .sort((a, b) => this.compareWeekKeys(a, b));
    const ordersVsTicketByWeek = new Map(ordersVsTicketWeekly.map((r) => [r._id, r]));

    return {
      range: { from, to, tz },
      charts: {
        activityDaily: {
          labels: dayLabels,
          datasets: [
            { key: 'logins', label: 'Logins', data: dayLabels.map((d) => loginsMap.get(d) ?? 0) },
            { key: 'quizzes', label: 'Quizzes', data: dayLabels.map((d) => quizzesMap.get(d) ?? 0) },
            { key: 'purchases', label: 'Compras', data: dayLabels.map((d) => purchasesMap.get(d) ?? 0) },
            {
              key: 'ecoCoinsEarned',
              label: 'EcoCoins ganados',
              data: dayLabels.map((d) => ecoCoinsEarnedMap.get(d) ?? 0),
            },
          ],
        },
        dimensionWeekly: {
          labels: dimensionWeeklyLabels,
          datasets: [
            {
              key: 'waste',
              label: 'Residuos',
              data: dimensionWeeklyLabels.map((w) => this.round2(dimensionRowByWeek.get(w)?.waste ?? 0)),
            },
            {
              key: 'transport',
              label: 'Transporte',
              data: dimensionWeeklyLabels.map((w) =>
                this.round2(dimensionRowByWeek.get(w)?.transport ?? 0),
              ),
            },
            {
              key: 'energy',
              label: 'Energía',
              data: dimensionWeeklyLabels.map((w) => this.round2(dimensionRowByWeek.get(w)?.energy ?? 0)),
            },
            {
              key: 'water',
              label: 'Agua',
              data: dimensionWeeklyLabels.map((w) => this.round2(dimensionRowByWeek.get(w)?.water ?? 0)),
            },
            {
              key: 'consumption',
              label: 'Consumo',
              data: dimensionWeeklyLabels.map((w) =>
                this.round2(dimensionRowByWeek.get(w)?.consumption ?? 0),
              ),
            },
          ],
        },
        ecoCoinsBreakdown: {
          labels: ['Ganados', 'Gastados', 'Disponibles'],
          data: [ecoCoinsBreakdown.earned, ecoCoinsBreakdown.spent, ecoCoinsBreakdown.balance],
        },
        ordersTopCustomers: {
          labels: ordersTopCustomers.labels,
          data: ordersTopCustomers.data,
        },
        streakDistribution: {
          labels: ['0-1', '2-3', '4-7', '8-14', '15+'],
          data: streakDistribution,
        },
        ordersVsTicketWeekly: {
          labels: ordersVsTicketLabels,
          bars: {
            label: 'Pedidos',
            data: ordersVsTicketLabels.map((w) => ordersVsTicketByWeek.get(w)?.orders ?? 0),
          },
          line: {
            label: 'Ticket Promedio',
            data: ordersVsTicketLabels.map((w) => this.round2(ordersVsTicketByWeek.get(w)?.avgTicket ?? 0)),
          },
        },
      },
    };
  }

  private normalizeDateOnly(input: string): string {
    const dateOnly = String(input ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      throw new BadRequestException('Formato de fecha inválido. Usa YYYY-MM-DD');
    }
    return dateOnly;
  }

  private buildDateLabels(from: string, to: string): string[] {
    const labels: string[] = [];
    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T00:00:00.000Z`);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      labels.push(d.toISOString().slice(0, 10));
    }
    return labels;
  }

  private compareWeekKeys(a: string, b: string): number {
    const pa = this.parseWeekKey(a);
    const pb = this.parseWeekKey(b);
    if (!pa || !pb) return a.localeCompare(b);
    if (pa.year !== pb.year) return pa.year - pb.year;
    return pa.week - pb.week;
  }

  private parseWeekKey(value: string): { year: number; week: number } | null {
    const m = /^(\d{4})-W(\d{1,2})$/.exec(value);
    if (!m) return null;
    return { year: Number(m[1]), week: Number(m[2]) };
  }

  private mapCountRows(rows: CountByKeyRow[]): Map<string, number> {
    return new Map(rows.map((r) => [r._id, r.count]));
  }

  private mapSumRows(rows: SumByKeyRow[]): Map<string, number> {
    return new Map(rows.map((r) => [r._id, r.total]));
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private async aggregateLoginsByDay(from: string, to: string): Promise<CountByKeyRow[]> {
    return this.userStreakModel
      .aggregate<CountByKeyRow>([
        { $unwind: '$loggedDates' },
        { $match: { loggedDates: { $gte: from, $lte: to } } },
        { $group: { _id: '$loggedDates', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .exec();
  }

  private async aggregateQuizCountByDay(from: string, to: string, tz: string): Promise<CountByKeyRow[]> {
    return this.quizSubmissionModel
      .aggregate<CountByKeyRow>([
        {
          $project: {
            dateKey: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
          },
        },
        { $match: { dateKey: { $gte: from, $lte: to } } },
        { $group: { _id: '$dateKey', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .exec();
  }

  private async aggregatePurchasesByDay(from: string, to: string, tz: string): Promise<CountByKeyRow[]> {
    return this.orderModel
      .aggregate<CountByKeyRow>([
        {
          $project: {
            dateKey: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
          },
        },
        { $match: { dateKey: { $gte: from, $lte: to } } },
        { $group: { _id: '$dateKey', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .exec();
  }

  private async aggregateEcoCoinsEarnedByDay(from: string, to: string, tz: string): Promise<SumByKeyRow[]> {
    return this.walletLedgerModel
      .aggregate<SumByKeyRow>([
        {
          $project: {
            type: 1,
            amount: 1,
            dateKey: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
          },
        },
        { $match: { type: LedgerType.EARN, dateKey: { $gte: from, $lte: to } } },
        { $group: { _id: '$dateKey', total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ])
      .exec();
  }

  private async aggregateDimensionWeekly(from: string, to: string, tz: string): Promise<DimensionWeekRow[]> {
    return this.ecoImpactWeekModel
      .aggregate<DimensionWeekRow>([
        {
          $project: {
            weekKey: 1,
            currentRadar: 1,
            dateKey: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt', timezone: tz } },
          },
        },
        { $match: { dateKey: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: '$weekKey',
            waste: { $avg: '$currentRadar.waste' },
            transport: { $avg: '$currentRadar.transport' },
            energy: { $avg: '$currentRadar.energy' },
            water: { $avg: '$currentRadar.water' },
            consumption: { $avg: '$currentRadar.consumption' },
          },
        },
      ])
      .exec();
  }

  private async aggregateEcoCoinsBreakdown(from: string, to: string, tz: string) {
    const [ledgerRows, walletBalanceRows] = await Promise.all([
      this.walletLedgerModel
        .aggregate<{ _id: LedgerType; total: number }>([
          {
            $project: {
              type: 1,
              amount: 1,
              dateKey: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
            },
          },
          {
            $match: {
              dateKey: { $gte: from, $lte: to },
              type: { $in: [LedgerType.EARN, LedgerType.SPEND] },
            },
          },
          { $group: { _id: '$type', total: { $sum: '$amount' } } },
        ])
        .exec(),
      this.walletModel.aggregate<{ _id: null; totalBalance: number }>([
        { $group: { _id: null, totalBalance: { $sum: '$ecoCoinsBalance' } } },
      ]),
    ]);

    const earned = ledgerRows.find((r) => r._id === LedgerType.EARN)?.total ?? 0;
    const spent = ledgerRows.find((r) => r._id === LedgerType.SPEND)?.total ?? 0;
    const balance = walletBalanceRows[0]?.totalBalance ?? 0;

    return { earned, spent, balance };
  }

  private async aggregateOrdersTopCustomers(from: string, to: string, tz: string) {
    const rows = await this.orderModel
      .aggregate<OrdersTopRow>([
        {
          $project: {
            userId: 1,
            dateKey: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
          },
        },
        { $match: { dateKey: { $gte: from, $lte: to } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 10 },
      ])
      .exec();

    const userIds = rows.map((r) => r._id);
    const users = userIds.length
      ? await this.userModel
          .find({ _id: { $in: userIds } })
          .select('_id fullName username displayName')
          .lean()
          .exec()
      : [];

    const userById = new Map(
      users.map((u) => [String(u._id), u.displayName || u.fullName || u.username || 'Usuario']),
    );

    return {
      labels: rows.map((r) => userById.get(String(r._id)) ?? 'Usuario'),
      data: rows.map((r) => r.count),
    };
  }

  private async aggregateStreakDistribution(): Promise<number[]> {
    const rows = await this.userStreakModel
      .aggregate<{
        _id: null;
        r01: number;
        r23: number;
        r47: number;
        r814: number;
        r15: number;
      }>([
        {
          $project: {
            bestStreak: { $ifNull: ['$bestStreak', 0] },
          },
        },
        {
          $group: {
            _id: null,
            r01: { $sum: { $cond: [{ $lte: ['$bestStreak', 1] }, 1, 0] } },
            r23: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$bestStreak', 2] }, { $lte: ['$bestStreak', 3] }] },
                  1,
                  0,
                ],
              },
            },
            r47: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$bestStreak', 4] }, { $lte: ['$bestStreak', 7] }] },
                  1,
                  0,
                ],
              },
            },
            r814: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$bestStreak', 8] }, { $lte: ['$bestStreak', 14] }] },
                  1,
                  0,
                ],
              },
            },
            r15: { $sum: { $cond: [{ $gte: ['$bestStreak', 15] }, 1, 0] } },
          },
        },
      ])
      .exec();

    const r = rows[0];
    if (!r) return [0, 0, 0, 0, 0];
    return [r.r01 ?? 0, r.r23 ?? 0, r.r47 ?? 0, r.r814 ?? 0, r.r15 ?? 0];
  }

  private async aggregateOrdersVsTicketWeekly(from: string, to: string, tz: string): Promise<WeekMetricsRow[]> {
    return this.orderModel
      .aggregate<WeekMetricsRow>([
        {
          $project: {
            totalMoneyToPay: 1,
            dateKey: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
            weekKey: { $dateToString: { format: '%G-W%V', date: '$createdAt', timezone: tz } },
          },
        },
        { $match: { dateKey: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: '$weekKey',
            orders: { $sum: 1 },
            totalAmount: { $sum: { $ifNull: ['$totalMoneyToPay', 0] } },
          },
        },
        {
          $project: {
            orders: 1,
            avgTicket: {
              $cond: [{ $gt: ['$orders', 0] }, { $divide: ['$totalAmount', '$orders'] }, 0],
            },
          },
        },
      ])
      .exec();
  }
}
