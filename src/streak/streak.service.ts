import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserStreak, UserStreakDocument } from './schemas/user-streak.schema';
import { getLocalISODate, getWeekDaysSundayStart, addDaysIso } from './utils/streak-dates';

type DayStatus = 'logged' | 'missed' | 'future';

@Injectable()
export class StreakService {
  private readonly tz = 'America/Guayaquil';

  constructor(
    @InjectModel(UserStreak.name) private streakModel: Model<UserStreakDocument>,
  ) {}

  async markToday(userId: string) {
   const today = getLocalISODate(new Date(), this.tz);
  const uid = new Types.ObjectId(userId);

  await this.streakModel.updateOne(
    { userId: uid },
    {
      $setOnInsert: { userId: uid },
      $addToSet: { loggedDates: today },
    },
    { upsert: true },
  );

    const doc = await this.streakModel.findOne({ userId: uid }).lean();
    const computed = this.compute(doc?.loggedDates ?? [], doc?.bestStreak ?? 0, today);

    // Actualiza bestStreak si creció
    if (doc && computed.streakBest > (doc.bestStreak ?? 0)) {
      await this.streakModel.updateOne(
        { userId: new Types.ObjectId(userId) },
        { $set: { bestStreak: computed.streakBest } },
      );
    }

    return computed;
  }

  async getMe(userId: string) {
    const today = getLocalISODate(new Date(), this.tz);
    const uid = new Types.ObjectId(userId);

    const doc = await this.streakModel.findOne({ userId: uid }).lean();    

    return this.compute(doc?.loggedDates ?? [], doc?.bestStreak ?? 0, today);
  }

  private compute(loggedDates: string[], bestStreakStored: number, todayIso: string) {
    const loggedSet = new Set(loggedDates);

    // streakCurrent: consecutivo hacia atrás desde hoy
    let streakCurrent = 0;
    for (let i = 0; ; i++) {
      const iso = addDaysIso(todayIso, -i);
      if (loggedSet.has(iso)) streakCurrent++;
      else break;
    }

    // bestStreak: recomputar (simple y seguro)
    const streakBest = Math.max(bestStreakStored, computeBestStreak(loggedDates));

    // Semana actual (domingo..sábado)
    const weekDays = getWeekDaysSundayStart(todayIso);
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];

    const weekLoggedCount = weekDays.filter(d => loggedSet.has(d)).length;

    // Clasificar cada día
    const currentWeekDays = weekDays.map((iso) => {
      const status: DayStatus =
        iso > todayIso ? 'future'
        : loggedSet.has(iso) ? 'logged'
        : 'missed';

      const [y, m, d] = iso.split('-').map(Number);
      return {
        date: iso,
        dayOfMonth: d,
        month: m,
        status,
      };
    });

    return {
      timezone: this.tz,
      today: todayIso,
      weekStart,
      weekEnd,
      loggedDates: [...loggedSet].sort(), // ordenadas
      totalDays: loggedSet.size,
      weekLoggedCount,
      streakCurrent,
      streakBest,
      currentWeekDays,
    };
  }
}

function computeBestStreak(loggedDates: string[]): number {
  const sorted = Array.from(new Set(loggedDates)).sort(); // YYYY-MM-DD orden lexicográfico OK
  if (sorted.length === 0) return 0;

  let best = 1;
  let cur = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const expected = addDaysIso(prev, 1);
    if (sorted[i] === expected) {
      cur++;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  return best;
}