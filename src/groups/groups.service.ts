import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EcoGroup, EcoGroupDocument, GroupJoinPolicy, GroupVisibility } from './schemas/eco-group.schema';
import { EcoGroupMember, EcoGroupMemberDocument, GroupRole, MemberStatus } from './schemas/eco-group-member.schema';
import { EcoGroupInvite, EcoGroupInviteDocument, InviteStatus } from './schemas/eco-group-invite.schema';
import { CreateGroupDto } from './dto/create-group.dto';
import * as crypto from 'crypto';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Notification,
  NotificationDocument,
  NotificationStatus,
  NotificationType,
} from '../notifications/schemas/notification.schema';
import { GroupPointsEvent, GroupPointsEventDocument } from './schemas/group-points-event.schema';
import { getWeekAndDateKey } from '../ecoimpact/utils/week.util';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(EcoGroup.name) private groupModel: Model<EcoGroupDocument>,
    @InjectModel(EcoGroupMember.name) private memberModel: Model<EcoGroupMemberDocument>,
    @InjectModel(EcoGroupInvite.name) private inviteModel: Model<EcoGroupInviteDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Notification.name) private notifModel: Model<NotificationDocument>,
    @InjectModel(GroupPointsEvent.name) private pointsModel: Model<GroupPointsEventDocument>,
  ) {}

  private async assertNoActiveGroup(userId: Types.ObjectId) {
    const active = await this.memberModel.findOne({ userId, status: MemberStatus.ACTIVE }).lean().exec();
    if (active) throw new BadRequestException('Ya perteneces a un grupo activo. Debes salir antes de unirte a otro.');
  }

  async createGroup(userId: string, dto: CreateGroupDto) {
    const uid = new Types.ObjectId(userId);
    await this.assertNoActiveGroup(uid);

    const group = await this.groupModel.create({
      name: dto.name.trim(),
      description: dto.description?.trim(),
      visibility: dto.visibility ?? GroupVisibility.PUBLIC,
      joinPolicy: dto.joinPolicy ?? GroupJoinPolicy.REQUEST_APPROVAL,
      ownerId: uid,
      memberCount: 1,
      level: 1,
      xp: 0,
    });

    await this.memberModel.create({
      groupId: group._id,
      userId: uid,
      role: GroupRole.OWNER,
      status: MemberStatus.ACTIVE,
      joinedAt: new Date(),
    });

    return { id: group._id, name: group.name, joinPolicy: group.joinPolicy, visibility: group.visibility };
  }

  async searchGroups(q: string) {
    const query = (q ?? '').trim();
    const filter: any = { visibility: GroupVisibility.PUBLIC };

    if (query.length >= 2) filter.name = new RegExp(escapeRegExp(query), 'i');

    const groups = await this.groupModel
      .find(filter)
      .select('_id name description memberCount level joinPolicy visibility')
      .sort({ memberCount: -1, createdAt: -1 })
      .limit(20)
      .lean()
      .exec();

    return groups.map(g => ({
      id: g._id,
      name: g.name,
      description: g.description ?? '',
      memberCount: g.memberCount,
      level: g.level,
      joinPolicy: g.joinPolicy,
      visibility: g.visibility,
    }));
  }

  async getMyGroup(userId: string) {
    const uid = new Types.ObjectId(userId);
    const membership = await this.memberModel.findOne({ userId: uid, status: MemberStatus.ACTIVE }).lean().exec();
    if (!membership) return { inGroup: false };

    const group = await this.groupModel.findById(membership.groupId).lean().exec();
    if (!group) return { inGroup: false };

    const members = await this.memberModel
      .find({ groupId: group._id, status: MemberStatus.ACTIVE })
      .lean()
      .exec();

    const userIds = members.map(m => m.userId);
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select('-passwordHash')
      .lean()
      .exec();

    const usersById = new Map(users.map(u => [u._id.toString(), u]));
    const membersWithUsers = members
      .map(m => {
        const u: any = usersById.get(m.userId.toString());
        if (!u) return null;
        return {
          role: m.role,
          joinedAt: m.joinedAt,
          user: {
            id: u._id,
            fullName: u.fullName,
            username: u.username,
            displayName: u?.displayName ?? '',
            avatarUrl: u?.avatarUrl ?? '',
            privacy: u.privacy,
            email: u.email,
            roles: u.roles,
            isActive: u.isActive,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
          },
        };
      })
      .filter(Boolean);

    return {
      inGroup: true,
      membership: { role: membership.role, joinedAt: membership.joinedAt },
      group: {
        id: group._id,
        name: group.name,
        description: group.description ?? '',
        memberCount: group.memberCount,
        level: group.level,
        xp: group.xp,
        joinPolicy: group.joinPolicy,
        visibility: group.visibility,
      },
      members: membersWithUsers,
    };
  }

  async requestJoin(userId: string, groupId: string) {
    const uid = new Types.ObjectId(userId);
    await this.assertNoActiveGroup(uid);

    const gid = new Types.ObjectId(groupId);
    const group = await this.groupModel.findById(gid).lean().exec();
    if (!group) throw new NotFoundException('Grupo no existe');

    if (group.visibility === GroupVisibility.PRIVATE && group.joinPolicy !== GroupJoinPolicy.REQUEST_APPROVAL) {
      throw new ForbiddenException('Grupo privado');
    }

    if (group.joinPolicy === GroupJoinPolicy.INVITE_ONLY) {
      throw new ForbiddenException('Este grupo solo permite invitación');
    }

    // upsert membership para evitar duplicados
    //const statusToSet = group.joinPolicy === GroupJoinPolicy.OPEN ? MemberStatus.ACTIVE : MemberStatus.PENDING;
    const roleToSet = MemberStatus.ACTIVE ? GroupRole.MEMBER : GroupRole.MEMBER;

    const now = new Date();
    const statusToSet =
    group.joinPolicy === GroupJoinPolicy.OPEN ? MemberStatus.ACTIVE : MemberStatus.PENDING;

    const update: any = {
    $setOnInsert: {
        groupId: gid,
        userId: uid,
        role: GroupRole.MEMBER,
    },
    $set: {
        status: statusToSet,
        joinedAt: statusToSet === MemberStatus.ACTIVE ? now : undefined,
    },
    };

    // Evita guardar joinedAt: undefined (Mongo lo puede dejar sucio)
    if (statusToSet !== MemberStatus.ACTIVE) {
    update.$unset = { joinedAt: '' };
    }

    const member = await this.memberModel.findOneAndUpdate(
    { groupId: gid, userId: uid },
    update,
    { upsert: true, new: true },
    );

    if (statusToSet === MemberStatus.ACTIVE) {
    await this.groupModel.updateOne({ _id: gid }, { $inc: { memberCount: 1 } }).exec();
    return { status: 'joined', groupId: gid };
    }

    return { status: 'requested', groupId: gid };
  }

  async leaveGroup(userId: string) {
    const uid = new Types.ObjectId(userId);
    const membership = await this.memberModel.findOne({ userId: uid, status: MemberStatus.ACTIVE }).exec();
    if (!membership) return { ok: true, status: 'not_in_group' };

    const group = await this.groupModel.findById(membership.groupId).exec();
    if (!group) {
      membership.status = MemberStatus.LEFT;
      await membership.save();
      return { ok: true, status: 'left' };
    }

    // Si owner se va, transferimos ownership al miembro más antiguo (ACTIVE)
    if (membership.role === GroupRole.OWNER) {
      const nextOwner = await this.memberModel
        .findOne({ groupId: group._id, status: MemberStatus.ACTIVE, userId: { $ne: uid } })
        .sort({ joinedAt: 1 })
        .exec();

      if (!nextOwner) {
        // si era el único miembro: eliminar grupo completo
        await this.memberModel.deleteMany({ groupId: group._id }).exec();
        await this.groupModel.deleteOne({ _id: group._id }).exec();
        return { ok: true, status: 'group_deleted' };
      }

      nextOwner.role = GroupRole.OWNER;
      await nextOwner.save();
      group.ownerId = nextOwner.userId;
      await group.save();
    }

    membership.status = MemberStatus.LEFT;
    membership.role = GroupRole.MEMBER;
    await membership.save();

    await this.groupModel.updateOne({ _id: group._id }, { $inc: { memberCount: -1 } }).exec();

    return { ok: true, status: 'left' };
  }

  async createInviteLink(userId: string, groupId: string) {
    const uid = new Types.ObjectId(userId);
    const gid = new Types.ObjectId(groupId);

    const membership = await this.memberModel.findOne({ userId: uid, groupId: gid, status: MemberStatus.ACTIVE }).lean().exec();
    if (!membership || membership.role !== GroupRole.OWNER) throw new ForbiddenException('Solo el owner puede invitar');

    const group = await this.groupModel.findById(gid).lean().exec();
    if (!group) throw new NotFoundException('Grupo no existe');

    const code = crypto.randomBytes(6).toString('base64url'); // corto y URL-safe
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await this.inviteModel.create({
      groupId: gid,
      inviterId: uid,
      code,
      status: InviteStatus.ACTIVE,
      uses: 0,
      maxUses: 20,
      expiresAt,
    });

    return { code: invite.code, expiresAt: invite.expiresAt, maxUses: invite.maxUses };
  }

  async joinByCode(userId: string, code: string) {
    const uid = new Types.ObjectId(userId);
    await this.assertNoActiveGroup(uid);

    const invite = await this.inviteModel.findOne({ code, status: InviteStatus.ACTIVE }).exec();
    if (!invite) throw new NotFoundException('Código inválido');

    if (invite.expiresAt.getTime() < Date.now()) {
      invite.status = InviteStatus.EXPIRED;
      await invite.save();
      throw new BadRequestException('Código expirado');
    }

    if (invite.uses >= invite.maxUses) throw new BadRequestException('Código sin cupos');

    const group = await this.groupModel.findById(invite.groupId).exec();
    if (!group) throw new NotFoundException('Grupo no existe');

    // Alta directa (por código)
    await this.memberModel.findOneAndUpdate(
      { groupId: group._id, userId: uid },
      { $set: { status: MemberStatus.ACTIVE, role: GroupRole.MEMBER, joinedAt: new Date() }, $setOnInsert: { groupId: group._id, userId: uid } },
      { upsert: true, new: true },
    );

    invite.uses += 1;
    await invite.save();

    await this.groupModel.updateOne({ _id: group._id }, { $inc: { memberCount: 1 } }).exec();

    return { status: 'joined', groupId: group._id, groupName: group.name };
  }

  async inviteUserToGroup(inviterId: string, groupId: string, inviteeId: string) {
    const inviter = new Types.ObjectId(inviterId);
    const invitee = new Types.ObjectId(inviteeId);
    const gid = new Types.ObjectId(groupId);

    if (inviter.equals(invitee)) {
      throw new BadRequestException('No puedes invitarte a ti mismo');
    }

    const membership = await this.memberModel
      .findOne({ userId: inviter, groupId: gid, status: MemberStatus.ACTIVE })
      .lean()
      .exec();
    if (!membership || membership.role !== GroupRole.OWNER) {
      throw new ForbiddenException('Solo el owner puede invitar');
    }

    const [group, inviteeUser] = await Promise.all([
      this.groupModel.findById(gid).lean().exec(),
      this.userModel.findById(invitee).select('_id username displayName').lean().exec(),
    ]);
    if (!group) throw new NotFoundException('Grupo no existe');
    if (!inviteeUser) throw new NotFoundException('Usuario no existe');

    const existingMember = await this.memberModel
      .findOne({ groupId: gid, userId: invitee, status: MemberStatus.ACTIVE })
      .lean()
      .exec();
    if (existingMember) {
      return { ok: true, status: 'already_member' };
    }

    await this.notifModel.updateOne(
      {
        userId: invitee,
        type: NotificationType.GROUP_INVITE,
        'payload.groupId': gid,
      },
      {
        $setOnInsert: {
          userId: invitee,
          type: NotificationType.GROUP_INVITE,
          status: NotificationStatus.UNREAD,
          title: 'Invitación a grupo',
          body: `Te invitaron a unirte al grupo ${group.name}.`,
          payload: {
            groupId: gid,
            inviterId: inviter,
            groupName: group.name,
          },
        },
      },
      { upsert: true },
    );

    return { ok: true, status: 'invited' };
  }

  async acceptGroupInvite(userId: string, notificationId: string) {
    const uid = new Types.ObjectId(userId);
    const nid = new Types.ObjectId(notificationId);

    const notif = await this.notifModel.findById(nid).exec();
    if (!notif) throw new NotFoundException('Notificación no existe');
    if (!notif.userId.equals(uid)) throw new ForbiddenException('No puedes operar esta notificación');

    if (notif.status === NotificationStatus.ARCHIVED) {
      return { idempotent: true, status: 'archived' };
    }

    if (notif.type !== NotificationType.GROUP_INVITE) {
      throw new BadRequestException(`Tipo no soportado: ${notif.type}`);
    }

    const groupId = notif.payload?.groupId;
    if (!groupId) throw new BadRequestException('Notificación sin groupId');

    await this.assertNoActiveGroup(uid);

    const gid = new Types.ObjectId(groupId);
    const group = await this.groupModel.findById(gid).exec();
    if (!group) throw new NotFoundException('Grupo no existe');

    const existing = await this.memberModel.findOne({ groupId: gid, userId: uid }).exec();
    if (existing?.status === MemberStatus.ACTIVE) {
      notif.status = NotificationStatus.ARCHIVED;
      await notif.save();
      return { idempotent: true, status: 'already_member' };
    }

    await this.memberModel.findOneAndUpdate(
      { groupId: gid, userId: uid },
      {
        $set: { status: MemberStatus.ACTIVE, role: GroupRole.MEMBER, joinedAt: new Date() },
        $setOnInsert: { groupId: gid, userId: uid },
      },
      { upsert: true, new: true },
    );

    await this.groupModel.updateOne({ _id: gid }, { $inc: { memberCount: 1 } }).exec();

    notif.status = NotificationStatus.ARCHIVED;
    await notif.save();

    return { ok: true, status: 'joined', groupId: gid, groupName: group.name };
  }

  async listJoinRequests(ownerId: string, groupId: string) {
    const oid = new Types.ObjectId(ownerId);
    const gid = new Types.ObjectId(groupId);

    const membership = await this.memberModel
      .findOne({ userId: oid, groupId: gid, status: MemberStatus.ACTIVE })
      .lean()
      .exec();
    if (!membership || membership.role !== GroupRole.OWNER) {
      throw new ForbiddenException('Solo el owner puede ver solicitudes');
    }

    const pending = await this.memberModel
      .find({ groupId: gid, status: MemberStatus.PENDING })
      .lean()
      .exec();

    const userIds = pending.map(m => m.userId);
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select('-passwordHash')
      .lean()
      .exec();

    const usersById = new Map(users.map(u => [u._id.toString(), u]));
    return pending
      .map(m => {
        const u: any = usersById.get(m.userId.toString());
        if (!u) return null;
        return {
          user: {
            id: u._id,
            fullName: u.fullName,
            username: u.username,
            displayName: u?.displayName ?? '',
            avatarUrl: u?.avatarUrl ?? '',
            privacy: u.privacy,
            email: u.email,
            roles: u.roles,
            isActive: u.isActive,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
          },
          requestedAt: m.createdAt,
        };
      })
      .filter(Boolean);
  }

  async acceptJoinRequest(ownerId: string, groupId: string, userId: string) {
    const oid = new Types.ObjectId(ownerId);
    const gid = new Types.ObjectId(groupId);
    const uid = new Types.ObjectId(userId);

    const membership = await this.memberModel
      .findOne({ userId: oid, groupId: gid, status: MemberStatus.ACTIVE })
      .lean()
      .exec();
    if (!membership || membership.role !== GroupRole.OWNER) {
      throw new ForbiddenException('Solo el owner puede aceptar solicitudes');
    }

    const request = await this.memberModel.findOne({ groupId: gid, userId: uid }).exec();
    if (!request) throw new NotFoundException('Solicitud no existe');

    if (request.status === MemberStatus.ACTIVE) {
      return { idempotent: true, status: 'already_member' };
    }

    if (request.status !== MemberStatus.PENDING) {
      throw new BadRequestException(`Estado no válido: ${request.status}`);
    }

    request.status = MemberStatus.ACTIVE;
    request.role = GroupRole.MEMBER;
    request.joinedAt = new Date();
    await request.save();

    await this.groupModel.updateOne({ _id: gid }, { $inc: { memberCount: 1 } }).exec();

    await this.notifModel.updateOne(
      {
        userId: uid,
        type: NotificationType.GROUP_JOIN_ACCEPTED,
        'payload.groupId': gid,
      },
      {
        $setOnInsert: {
          userId: uid,
          type: NotificationType.GROUP_JOIN_ACCEPTED,
          status: NotificationStatus.UNREAD,
          title: 'Solicitud aceptada',
          body: `Tu solicitud para unirte a ${request.groupId.toString()} fue aceptada.`,
          payload: {
            groupId: gid,
            acceptedBy: oid,
          },
        },
      },
      { upsert: true },
    );

    return { ok: true, status: 'accepted', groupId: gid, userId: uid };
  }

  async listMyJoinRequests(userId: string) {
    const uid = new Types.ObjectId(userId);

    const requests = await this.memberModel
      .find({ userId: uid, status: MemberStatus.PENDING })
      .lean()
      .exec();

    if (!requests.length) return [];

    const groupIds = requests.map(r => r.groupId);
    const groups = await this.groupModel
      .find({ _id: { $in: groupIds } })
      .select('_id name description memberCount level joinPolicy visibility')
      .lean()
      .exec();

    const groupsById = new Map(groups.map(g => [g._id.toString(), g]));
    return requests
      .map(r => {
        const g: any = groupsById.get(r.groupId.toString());
        if (!g) return null;
        return {
          group: {
            id: g._id,
            name: g.name,
            description: g.description ?? '',
            memberCount: g.memberCount,
            level: g.level,
            joinPolicy: g.joinPolicy,
            visibility: g.visibility,
          },
          requestedAt: r.createdAt,
          status: r.status,
        };
      })
      .filter(Boolean);
  }

  async listMyGroupPointsEvents(userId: string, weekKey?: string) {
    const uid = new Types.ObjectId(userId);
    const membership = await this.memberModel.findOne({ userId: uid, status: MemberStatus.ACTIVE }).lean().exec();
    if (!membership) return { inGroup: false, items: [] };

    const wk = weekKey ?? getWeekAndDateKey().weekKey;
    const items = await this.pointsModel
      .find({ groupId: membership.groupId, weekKey: wk })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
      .exec();

    return {
      inGroup: true,
      weekKey: wk,
      total: items.length,
      items: items.map((e) => ({
        id: e._id,
        userId: e.userId,
        eventKey: e.eventKey,
        points: e.points,
        source: e.source,
        dateKey: e.dateKey ?? null,
        createdAt: e.createdAt,
      })),
    };
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
