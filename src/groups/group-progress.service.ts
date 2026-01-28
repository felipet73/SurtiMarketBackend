import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EcoGroupMember, EcoGroupMemberDocument, MemberStatus } from './schemas/eco-group-member.schema';
import { GroupWeeklyProgress, GroupWeeklyProgressDocument } from './schemas/group-weekly-progress.schema';
import { EcoGroup, EcoGroupDocument } from './schemas/eco-group.schema';
import { EcoNeighborhoodAsset, EcoNeighborhoodAssetDocument, AssetType, Rarity } from './schemas/eco-neighborhood-asset.schema';
import { getISOWeekKey } from '../common/utils/week-key';

@Injectable()
export class GroupProgressService {
  constructor(
    @InjectModel(EcoGroupMember.name) private memberModel: Model<EcoGroupMemberDocument>,
    @InjectModel(EcoGroup.name) private groupModel: Model<EcoGroupDocument>,
    @InjectModel(GroupWeeklyProgress.name) private progressModel: Model<GroupWeeklyProgressDocument>,
    @InjectModel(EcoNeighborhoodAsset.name) private assetModel: Model<EcoNeighborhoodAssetDocument>,
  ) {}

  // Llamar cuando un usuario "PASÓ" su weekly quiz
  async onMemberWeeklyQuizPassed(params: { userId: string; dimension: any }) {
    const uid = new Types.ObjectId(params.userId);
    const membership = await this.memberModel.findOne({ userId: uid, status: MemberStatus.ACTIVE }).lean().exec();
    if (!membership) return { ok: true, inGroup: false };

    const group = await this.groupModel.findById(membership.groupId).lean().exec();
    if (!group) return { ok: true, inGroup: false };

    const weekKey = getISOWeekKey(new Date());

    // Target simple: 60% de miembros (mín 2)
    const target = Math.max(2, Math.ceil((group.memberCount || 1) * 0.6));

    // Upsert progreso
    const progress = await this.progressModel.findOneAndUpdate(
      { groupId: group._id, weekKey },
      {
        $setOnInsert: { groupId: group._id, weekKey, quizPassCount: 0, targetQuizPasses: target, isCompleted: false, pointsEarned: 0, dimension: params.dimension },
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