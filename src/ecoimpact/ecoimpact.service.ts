import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EcoImpactEvent, EcoImpactEventDocument } from './schemas/ecoimpact-event.schema';
import { EcoImpactWeek, EcoImpactWeekDocument } from './schemas/ecoimpact-week.schema';
import { EcoImpactScore, EcoImpactScoreDocument } from './schemas/ecoimpact-score.schema';
import { EcoImpactDailySnapshot, EcoImpactDailySnapshotDocument } from './schemas/ecoimpact-daily.schema';
import { EcoGroupMember, EcoGroupMemberDocument, MemberStatus } from '../groups/schemas/eco-group-member.schema';
import { GroupPointsEvent, GroupPointsEventDocument } from '../groups/schemas/group-points-event.schema';
import { Dimension, EcoImpactEventDto, EcoImpactEventType } from './dto/ecoimpact.dto';
import { getWeekAndDateKey } from './utils/week.util';
import { OpenAiEcoImpactService } from './openai/openai-ecoimpact.service';
import { EcoGroup, EcoGroupDocument, GroupVisibility } from '../groups/schemas/eco-group.schema';

type Radar5 = {
  waste: number;
  transport: number;
  energy: number;
  water: number;
  consumption: number;
};

const DEFAULT_BASELINE: Radar5 = {
  waste: 6,
  transport: 5,
  energy: 6,
  water: 4,
  consumption: 6,
};

const FALLBACK_GROUP_ID = '000000000000000000000001';

const DIMENSIONS: Dimension[] = [
  Dimension.WASTE,
  Dimension.TRANSPORT,
  Dimension.ENERGY,
  Dimension.WATER,
  Dimension.CONSUMPTION,
];

function clamp(n: number, min = 0, max = 10) {
  return Math.max(min, Math.min(max, n));
}

function cloneRadar(r: Radar5): Radar5 {
  return { ...r };
}

function pickFocusDimension(baseline: Radar5): Dimension {
  let lowest = DIMENSIONS[0];
  let min = baseline[lowest];
  for (const d of DIMENSIONS) {
    if (baseline[d] < min) {
      min = baseline[d];
      lowest = d;
    }
  }
  return lowest;
}

function computeProgressPercent(current: Radar5, target: Radar5) {
  const ratios = DIMENSIONS.map((d) => {
    const t = target[d] || 1;
    return Math.min(1, current[d] / t);
  });
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  return Math.round(avg * 100);
}

function applyDelta(current: Radar5, dimension: Dimension | null, delta: number) {
  const next = cloneRadar(current);
  if (!dimension) return next;
  next[dimension] = clamp(next[dimension] + delta);
  return next;
}

function applyAllDelta(current: Radar5, delta: number) {
  const next = cloneRadar(current);
  for (const d of DIMENSIONS) {
    next[d] = clamp(next[d] + delta);
  }
  return next;
}

@Injectable()
export class EcoImpactService {
  constructor(
    @InjectModel(EcoImpactWeek.name) private weekModel: Model<EcoImpactWeekDocument>,
    @InjectModel(EcoImpactEvent.name) private eventModel: Model<EcoImpactEventDocument>,
    @InjectModel(EcoImpactScore.name) private scoreModel: Model<EcoImpactScoreDocument>,
    @InjectModel(EcoImpactDailySnapshot.name) private dailyModel: Model<EcoImpactDailySnapshotDocument>,
    @InjectModel(EcoGroupMember.name) private memberModel: Model<EcoGroupMemberDocument>,
    @InjectModel(EcoGroup.name) private groupModel: Model<EcoGroupDocument>,
    @InjectModel(GroupPointsEvent.name) private pointsModel: Model<GroupPointsEventDocument>,
    private readonly openai: OpenAiEcoImpactService,
  ) {}

  private async getGroupIdForUser(userId: string): Promise<Types.ObjectId> {
    const uid = new Types.ObjectId(userId);
    const membership = await this.memberModel
      .findOne({ userId: uid, status: MemberStatus.ACTIVE })
      .lean()
      .exec();
    return membership?.groupId ?? new Types.ObjectId(FALLBACK_GROUP_ID);
  }

  async ensureWeekForGroup(groupId: Types.ObjectId, weekKey: string) {
    let week = await this.weekModel.findOne({ groupId, weekKey }).exec();
    if (week) return week;

    const baseline = cloneRadar(DEFAULT_BASELINE);
    const focus = pickFocusDimension(baseline);
    const ai = await this.openai.generateTargetAndMessages({
      weekKey,
      baselineRadar: baseline,
      focusDimension: focus,
      locale: 'es-EC',
    });

    week = await this.weekModel.create({
      groupId,
      weekKey,
      focusDimension: focus,
      baselineRadar: baseline,
      currentRadar: baseline,
      targetRadar: ai.targetRadar,
      ai: {
        summary: ai.summary,
        messages: ai.messages,
      },
    });

    return week;
  }

  async getMyEcoImpact(userId: string) {
    const groupId = await this.getGroupIdForUser(userId);

    const { weekKey, dateKey, dayOfWeek, timeZone } = getWeekAndDateKey();
    const week = await this.ensureWeekForGroup(groupId, weekKey);

    return {
      inGroup: true,
      groupId,
      weekKey,
      dateKey,
      dayOfWeek,
      timeZone,
      focusDimension: week.focusDimension,
      baselineRadar: week.baselineRadar,
      currentRadar: week.currentRadar,
      targetRadar: week.targetRadar,
      ai: week.ai,
      progressPercent: computeProgressPercent(week.currentRadar as Radar5, week.targetRadar as Radar5),
    };
  }

  async registerEvent(userId: string, dto: EcoImpactEventDto) {
    const groupId = await this.getGroupIdForUser(userId);

    const { weekKey, dateKey } = getWeekAndDateKey();
    const week = await this.ensureWeekForGroup(groupId, weekKey);

    const uid = new Types.ObjectId(userId);
    const query: Record<string, unknown> = {
      userId: uid,
      groupId,
      weekKey,
      type: dto.type,
      dateKey,
    };
    if (dto.sourceId) query.sourceId = dto.sourceId;
    else query.sourceId = { $exists: false };

    const existing = await this.eventModel.findOne(query).lean().exec();
    if (existing) {
      return {
        idempotent: true,
        currentRadar: week.currentRadar,
        progressPercent: computeProgressPercent(week.currentRadar, week.targetRadar),
      };
    }

    let delta = 0;
    let dimension: Dimension | null = dto.dimension ?? null;

    switch (dto.type) {
      case EcoImpactEventType.STREAK:
        delta = 0.15;
        dimension = null;
        break;
      case EcoImpactEventType.QUIZ:
        delta = 0.4;
        dimension = dimension ?? week.focusDimension;
        break;
      case EcoImpactEventType.PURCHASE:
        delta = 0.3;
        dimension = dimension ?? Dimension.CONSUMPTION;
        break;
      case EcoImpactEventType.CHALLENGE:
        delta = 0.5;
        dimension = dimension ?? week.focusDimension;
        break;
      default:
        throw new BadRequestException('Tipo de evento no soportado');
    }

    if (dto.delta !== undefined) {
      delta = clamp(dto.delta, 0, 3);
    }

    const nextRadar =
      dto.type === EcoImpactEventType.STREAK
        ? applyAllDelta(week.currentRadar as Radar5, delta)
        : applyDelta(week.currentRadar as Radar5, dimension, delta);

    await this.eventModel.create({
      userId: uid,
      groupId,
      weekKey,
      dateKey,
      type: dto.type,
      dimension: dimension ?? undefined,
      delta,
      sourceId: dto.sourceId,
    });

    week.currentRadar = nextRadar;
    await week.save();

    const { score, rank } = await this.recomputeScoresAndRank(weekKey, groupId, dateKey);

    return {
      idempotent: false,
      currentRadar: week.currentRadar,
      progressPercent: computeProgressPercent(week.currentRadar as Radar5, week.targetRadar as Radar5),
      score,
      rank,
    };
  }

  private async recomputeScoresAndRank(weekKey: string, groupId: Types.ObjectId, dateKey?: string) {
    const [ecoAgg, pointsAgg, groups] = await Promise.all([
      this.eventModel
        .aggregate([
          { $match: { weekKey } },
          {
            $group: {
              _id: '$groupId',
              rawPoints: { $sum: { $ifNull: ['$delta', 0] } },
              users: { $addToSet: '$userId' },
            },
          },
        ])
        .exec(),
      this.pointsModel
        .aggregate([
          { $match: { weekKey } },
          {
            $group: {
              _id: '$groupId',
              rawPoints: { $sum: { $ifNull: ['$points', 0] } },
              users: { $addToSet: '$userId' },
            },
          },
        ])
        .exec(),
      this.groupModel.find({}).select('_id name memberCount visibility').lean().exec(),
    ]);

    const statsById = new Map<string, { rawPoints: number; users: Set<string> }>();
    for (const a of ecoAgg as Array<{ _id: Types.ObjectId; rawPoints: number; users: Types.ObjectId[] }>) {
      const id = a._id.toString();
      statsById.set(id, {
        rawPoints: a.rawPoints as number,
        users: new Set((a.users ?? []).map((u: Types.ObjectId) => u.toString())),
      });
    }
    for (const p of pointsAgg as Array<{ _id: Types.ObjectId; rawPoints: number; users: Types.ObjectId[] }>) {
      const id = p._id.toString();
      const existing = statsById.get(id);
      const pUsers = new Set((p.users ?? []).map((u: Types.ObjectId) => u.toString()));
      if (existing) {
        existing.rawPoints += p.rawPoints as number;
        for (const u of pUsers) existing.users.add(u);
      } else {
        statsById.set(id, {
          rawPoints: p.rawPoints as number,
          users: pUsers,
        });
      }
    }

    const scored = groups.map((g) => {
      const stats = statsById.get(g._id.toString());
      const rawPoints = stats?.rawPoints ?? 0;
      const activeMembers = stats?.users.size ?? 0;
      const memberCount = g.memberCount ?? 0;
      const participationRate = activeMembers / Math.max(1, memberCount);
      const base = (rawPoints / Math.max(1, activeMembers)) * (0.8 + 0.4 * participationRate);
      const score = Math.max(0, Math.round(base * 10));
      return {
        groupId: g._id,
        groupName: g.name ?? 'Grupo',
        memberCount,
        activeMembers,
        rawPoints,
        participationRate,
        score,
      };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.groupName).localeCompare(String(b.groupName));
    });

    const prev = await this.scoreModel.find({ weekKey }).lean().exec();
    const prevRankById = new Map(prev.map((s) => [s.groupId.toString(), s.rank]));

    const ranked = scored.map((s, i) => {
      const rank = i + 1;
      const prevRank = prevRankById.get(s.groupId.toString());
      const deltaRank = prevRank ? prevRank - rank : 0;
      return { ...s, rank, deltaRank };
    });

    for (const s of ranked) {
      await this.scoreModel.updateOne(
        { weekKey, groupId: s.groupId },
        {
          $set: {
            weekKey,
            groupId: s.groupId,
            groupName: s.groupName,
            score: s.score,
            rawPoints: s.rawPoints,
            activeMembers: s.activeMembers,
            memberCount: s.memberCount,
            participationRate: s.participationRate,
            rank: s.rank,
            deltaRank: s.deltaRank,
          },
        },
        { upsert: true },
      );
    }

    if (dateKey) {
      const groupScore = ranked.find((s) => s.groupId.toString() === groupId.toString());
      if (groupScore) {
        const rank = groupScore.rank;
        await this.dailyModel.updateOne(
          { weekKey, dateKey, groupId },
          { $set: { weekKey, dateKey, groupId, score: groupScore.score, rank } },
          { upsert: true },
        );
        return { score: groupScore.score, rank, ranked };
      }
    }

    const groupScore = ranked.find((s) => s.groupId.toString() === groupId.toString());
    const score = groupScore?.score ?? 0;
    const rank = groupScore?.rank ?? 0;
    return { score, rank, ranked };
  }

  async getLeaderboard(userId: string, weekKey?: string, limit = 10, page = 1) {
    const groupId = await this.getGroupIdForUser(userId);

    const wk = weekKey ?? getWeekAndDateKey().weekKey;
    const recompute = await this.recomputeScoresAndRank(wk, groupId);
    const ranked = recompute.ranked ?? [];

    const pageSize = Math.min(50, Math.max(1, limit));
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * pageSize;

    const totalGroups = ranked.length;
    const scores = ranked.slice(skip, skip + pageSize);
    const my = ranked.find((s) => s.groupId.toString() === groupId.toString()) ?? null;

    return {
      weekKey: wk,
      totalGroups,
      page: safePage,
      pageSize,
      myGroup: my
        ? {
          groupId: my.groupId,
          name: my.groupName,
          rank: my.rank,
          score: my.score,
          deltaRank: my.deltaRank,
        }
        : null,
      leaders: scores.map((s) => ({
        groupId: s.groupId,
        name: s.groupName,
        rank: s.rank,
        score: s.score,
        deltaRank: s.deltaRank,
      })),
    };
  }

  async compareGroups(userId: string, groupIdsCsv: string, weekKey?: string) {
    const myGroupId = await this.getGroupIdForUser(userId);

    const rawIds = groupIdsCsv
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 5)
      .filter((s) => Types.ObjectId.isValid(s));

    if (!rawIds.length) {
      throw new BadRequestException('groupIds inválido');
    }

    const ids = rawIds.map((s) => new Types.ObjectId(s));

    const wk = weekKey ?? getWeekAndDateKey().weekKey;
    await this.recomputeScoresAndRank(wk, myGroupId);

    const groups = await this.groupModel
      .find({
        _id: { $in: ids },
        $or: [{ visibility: GroupVisibility.PUBLIC }, { _id: myGroupId }],
      })
      .select('_id name visibility')
      .lean()
      .exec();

    const groupMap = new Map(groups.map((g) => [g._id.toString(), g]));
    const weeks = await this.weekModel
      .find({ groupId: { $in: ids }, weekKey: wk })
      .lean()
      .exec();
    const weekMap = new Map(weeks.map((w) => [w.groupId.toString(), w]));

    const scores = await this.scoreModel.find({ weekKey: wk, groupId: { $in: ids } }).lean().exec();
    const scoreMap = new Map(scores.map((s) => [s.groupId.toString(), s]));

    return ids
      .map((id) => {
        const g = groupMap.get(id.toString());
        if (!g) return null;
        const w = weekMap.get(id.toString());
        const s = scoreMap.get(id.toString());
        return {
          groupId: id,
          name: g.name,
          rank: s?.rank ?? null,
          score: s?.score ?? 0,
          currentRadar: w?.currentRadar ?? null,
          targetRadar: w?.targetRadar ?? null,
          focusDimension: w?.focusDimension ?? null,
        };
      })
      .filter(Boolean);
  }

  async getProgress(userId: string, weekKey?: string) {
    const groupId = await this.getGroupIdForUser(userId);

    const wk = weekKey ?? getWeekAndDateKey().weekKey;
    const snapshots = await this.dailyModel
      .find({ weekKey: wk, groupId })
      .sort({ dateKey: 1 })
      .lean()
      .exec();

    if (snapshots.length) {
      return {
        inGroup: true,
        weekKey: wk,
        pointsSeries: snapshots.map((s) => ({ dateKey: s.dateKey, score: s.score })),
        rankSeries: snapshots.map((s) => ({ dateKey: s.dateKey, rank: s.rank })),
      };
    }

    const events = await this.eventModel
      .find({ weekKey: wk, groupId })
      .select('dateKey delta')
      .lean()
      .exec();

    const byDate = new Map<string, number>();
    for (const e of events) {
      const prev = byDate.get(e.dateKey) ?? 0;
      byDate.set(e.dateKey, prev + (e.delta ?? 0));
    }

    const dates = Array.from(byDate.keys()).sort();
    const pointsSeries = dates.map((d) => ({
      dateKey: d,
      score: Math.min(100, Math.round((byDate.get(d) ?? 0) * 10)),
    }));

    if (!events.length) {
      const { dateKey } = getWeekAndDateKey();
      return {
        inGroup: true,
        weekKey: wk,
        pointsSeries: [{ dateKey, score: 10 }],
        rankSeries: [{ dateKey, rank: 1 }],
      };
    }

    return {
      inGroup: true,
      weekKey: wk,
      pointsSeries,
      rankSeries: [],
    };
  }
}
