import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EcoGroupMember, EcoGroupMemberDocument, MemberStatus } from './schemas/eco-group-member.schema';
import { GroupWeeklyProgress, GroupWeeklyProgressDocument } from './schemas/group-weekly-progress.schema';
import { GroupPointsEvent, GroupPointsEventDocument } from './schemas/group-points-event.schema';
import { EcoGroup, EcoGroupDocument } from './schemas/eco-group.schema';
import { EcoNeighborhoodAsset, EcoNeighborhoodAssetDocument, AssetType, Rarity } from './schemas/eco-neighborhood-asset.schema';
import { getWeekAndDateKey } from '../ecoimpact/utils/week.util';
import { UserStreak, UserStreakDocument } from '../streak/schemas/user-streak.schema';
import { getWeekDaysSundayStart } from '../streak/utils/streak-dates';

@Injectable()
export class GroupProgressService {
  constructor(
    @InjectModel(EcoGroupMember.name) private memberModel: Model<EcoGroupMemberDocument>,
    @InjectModel(EcoGroup.name) private groupModel: Model<EcoGroupDocument>,
    @InjectModel(GroupWeeklyProgress.name) private progressModel: Model<GroupWeeklyProgressDocument>,
    @InjectModel(GroupPointsEvent.name) private pointsModel: Model<GroupPointsEventDocument>,
    @InjectModel(UserStreak.name) private streakModel: Model<UserStreakDocument>,
    @InjectModel(EcoNeighborhoodAsset.name) private assetModel: Model<EcoNeighborhoodAssetDocument>,
  ) {}

  // Llamar cuando un usuario "PASÓ" su weekly quiz
  async onMemberWeeklyQuizPassed(params: { userId: string; dimension: 'waste' | 'transport' | 'energy' | 'water' | 'consumption' }) {
    const uid = new Types.ObjectId(params.userId);
    const membership = await this.memberModel.findOne({ userId: uid, status: MemberStatus.ACTIVE }).lean().exec();
    if (!membership) return { ok: true, inGroup: false };

    const group = await this.groupModel.findById(membership.groupId).lean().exec();
    if (!group) return { ok: true, inGroup: false };

    const weekKey = getWeekAndDateKey().weekKey;
    const countKey = `QUIZ_PASS_COUNT:${weekKey}:${params.userId}`;
    const countRes = await this.pointsModel.updateOne(
      { groupId: group._id, eventKey: countKey },
      {
        $setOnInsert: {
          groupId: group._id,
          userId: uid,
          weekKey,
          eventKey: countKey,
          points: 0,
          source: 'QUIZ_PASS_COUNT',
        },
      },
      { upsert: true },
    );
    const wasInserted = (countRes.upsertedCount ?? 0) > 0 || !!countRes.upsertedId;
    if (!wasInserted) return { ok: true, inGroup: true, status: 'already_counted' };

    // Target simple: 60% de miembros (mín 2)
    const target = Math.max(2, Math.ceil((group.memberCount || 1) * 0.6));

    // Upsert progreso
    const progress = await this.progressModel.findOneAndUpdate(
      { groupId: group._id, weekKey },
      {
        $setOnInsert: { groupId: group._id, weekKey, isCompleted: false, pointsEarned: 0 },
        $set: { targetQuizPasses: target, dimension: params.dimension },
        $inc: { quizPassCount: 1 },
      },
      { upsert: true, new: true },
    );

    // Si ya estaba completo, no vuelvas a dar puntos
    if (progress.isCompleted) return { ok: true, inGroup: true, status: 'already_completed' };

    // Completar si llega al target
    if (progress.quizPassCount >= progress.targetQuizPasses) {
      progress.isCompleted = true;
      progress.pointsEarned = 200; // puntos semanales del grupo (ajustable)
      await progress.save();

      // Sumar XP al grupo y recalcular level simple
      const updatedGroup = await this.groupModel.findByIdAndUpdate(
        group._id,
        { $inc: { xp: progress.pointsEarned } },
        { new: true },
      ).exec();

      // award medal (EcoVecindad)
      const medalKey = `MEDAL_${String(progress.dimension ?? 'GEN').toUpperCase()}_${weekKey}`;
      await this.assetModel.updateOne(
        { groupId: group._id, assetKey: medalKey },
        {
          $setOnInsert: {
            groupId: group._id,
            assetType: AssetType.MEDAL,
            assetKey: medalKey,
            rarity: Rarity.COMMON,
            awardedAt: new Date(),
            reasonRef: { weekKey, dimension: progress.dimension, source: 'GROUP_WEEKLY_PROGRESS' },
          },
        },
        { upsert: true },
      );

      // Level simple: cada 1000xp sube 1
      if (updatedGroup) {
        const level = Math.floor((updatedGroup.xp || 0) / 1000) + 1;
        if (level !== updatedGroup.level) {
          await this.groupModel.updateOne({ _id: updatedGroup._id }, { $set: { level } }).exec();
          const buildingKey = `BUILDING_LVL_${level}`;
          await this.assetModel.updateOne(
            { groupId: updatedGroup._id, assetKey: buildingKey },
            {
              $setOnInsert: {
                groupId: updatedGroup._id,
                assetType: AssetType.BUILDING,
                assetKey: buildingKey,
                rarity: Rarity.RARE,
                awardedAt: new Date(),
                reasonRef: { level, source: 'LEVEL_UP' },
              },
            },
            { upsert: true },
          );
        }
      }

      return { ok: true, inGroup: true, status: 'completed', pointsEarned: progress.pointsEarned };
    }

    return { ok: true, inGroup: true, status: 'progress', quizPassCount: progress.quizPassCount, target: progress.targetQuizPasses };
  }

  async addPoints(params: {
    userId: string;
    points: number;
    eventKey: string;
    source: string;
    weekKey?: string;
    dateKey?: string;
  }) {
    if (params.points <= 0) return { ok: true, idempotent: true };

    const uid = new Types.ObjectId(params.userId);
    const membership = await this.memberModel.findOne({ userId: uid, status: MemberStatus.ACTIVE }).lean().exec();
    if (!membership) return { ok: true, inGroup: false };

    const group = await this.groupModel.findById(membership.groupId).lean().exec();
    if (!group) return { ok: true, inGroup: false };

    const weekKey = params.weekKey ?? getWeekAndDateKey().weekKey;
    const eventKey = params.eventKey;

    const res = await this.pointsModel.updateOne(
      { groupId: group._id, eventKey },
      {
        $setOnInsert: {
          groupId: group._id,
          userId: uid,
          weekKey,
          dateKey: params.dateKey,
          eventKey,
          points: params.points,
          source: params.source,
        },
      },
      { upsert: true },
    );

    const wasInserted = (res.upsertedCount ?? 0) > 0 || !!res.upsertedId;
    if (!wasInserted) return { ok: true, inGroup: true, idempotent: true, groupId: group._id };

    await this.progressModel.updateOne(
      { groupId: group._id, weekKey },
      {
        $setOnInsert: { groupId: group._id, weekKey, isCompleted: false, quizPassCount: 0, targetQuizPasses: 0 },
        $inc: { pointsEarned: params.points },
      },
      { upsert: true },
    );

    return { ok: true, inGroup: true, idempotent: false, groupId: group._id };
  }

  async recalcWeeklyStreakPointsForGroup(params: { userId: string; todayIso: string }) {
    const uid = new Types.ObjectId(params.userId);
    const membership = await this.memberModel.findOne({ userId: uid, status: MemberStatus.ACTIVE }).lean().exec();
    if (!membership) return { ok: true, inGroup: false };

    const groupId = membership.groupId;
    const weekDays = getWeekDaysSundayStart(params.todayIso);
    const weekKey = getWeekAndDateKey().weekKey;

    const members = await this.memberModel
      .find({ groupId, status: MemberStatus.ACTIVE })
      .select('userId')
      .lean()
      .exec();
    const memberIds = members.map((m) => m.userId);

    const streaks = await this.streakModel.find({ userId: { $in: memberIds } }).lean().exec();
    const loggedByUser = new Map<string, Set<string>>();
    for (const s of streaks) {
      loggedByUser.set(String(s.userId), new Set(s.loggedDates ?? []));
    }

    for (const mid of memberIds) {
      const logged = loggedByUser.get(String(mid)) ?? new Set<string>();
      for (const d of weekDays) {
        if (logged.has(d)) {
          await this.addPoints({
            userId: String(mid),
            points: 10,
            eventKey: `STREAK_DAY:${d}:${String(mid)}`,
            source: 'STREAK_DAY',
            weekKey,
            dateKey: d,
          });
        }
      }
    }

    return { ok: true, inGroup: true, weekKey };
  }

  async weeklyLeaderboard(weekKey: string) {
    const rows = await this.progressModel
      .aggregate([
        { $match: { weekKey } },
        { $sort: { pointsEarned: -1, quizPassCount: -1 } },
        { $limit: 20 },
      ]);

    // Enriquecer con nombre de grupo
    const groupIds = rows.map(r => r.groupId);
    const groups = await this.groupModel.find({ _id: { $in: groupIds } }).select('_id name level xp memberCount').lean().exec();
    const map = new Map(groups.map(g => [String(g._id), g]));

    return rows.map((r, i) => {
      const g = map.get(String(r.groupId));
      return {
        rank: i + 1,
        groupId: r.groupId,
        name: g?.name ?? 'Grupo',
        level: g?.level ?? 1,
        memberCount: g?.memberCount ?? 0,
        pointsEarned: r.pointsEarned,
        quizPassCount: r.quizPassCount,
        targetQuizPasses: r.targetQuizPasses,
        isCompleted: r.isCompleted,
      };
    });
  }

  async myNeighborhoodAssets(groupId: string) {
    const gid = new Types.ObjectId(groupId);
    return this.assetModel
      .find({ groupId: gid })
      .select('assetType assetKey rarity awardedAt reasonRef')
      .sort({ awardedAt: -1 })
      .lean()
      .exec();
  }
}
