import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationStatus, NotificationType } from './schemas/notification.schema';
import { Friendship, FriendshipDocument, FriendshipStatus } from '../social/schemas/friendship.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notifModel: Model<NotificationDocument>,
    @InjectModel(Friendship.name) private friendshipModel: Model<FriendshipDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async listMyNotifications(userId: string) {
    const uid = new Types.ObjectId(userId);
    const items = await this.notifModel
      .find({ userId: uid, status: { $in: [NotificationStatus.UNREAD, NotificationStatus.READ] } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
    //return userId;
    return items.map((n: any) => ({
      id: n._id,
      type: n.type,
      status: n.status,
      title: n.title,
      body: n.body,
      payload: n.payload,
      createdAt: n.createdAt,
    }));
  }

  async markNonActionableAsRead(userId: string) {
    const uid = new Types.ObjectId(userId);
    const actionableTypes: NotificationType[] = [
      NotificationType.FRIEND_REQUEST,
      NotificationType.GROUP_INVITE,
    ];

    const res = await this.notifModel.updateMany(
      {
        userId: uid,
        status: NotificationStatus.UNREAD,
        type: { $nin: actionableTypes },
      },
      {
        $set: { status: NotificationStatus.READ },
      },
    );

    return {
      ok: true,
      matched: res.matchedCount ?? 0,
      modified: res.modifiedCount ?? 0,
      excludedTypes: actionableTypes,
    };
  }

  async accept(userId: string, notificationId: string) {
    const uid = new Types.ObjectId(userId);
    const nid = new Types.ObjectId(notificationId);

    const notif = await this.notifModel.findById(nid).exec();
    if (!notif) throw new NotFoundException('Notificación no existe');
    if (!notif.userId.equals(uid)) throw new ForbiddenException('No puedes operar esta notificación');

    // Idempotencia: si ya está archivada, devolvemos OK sin repetir acciones
    if (notif.status === NotificationStatus.ARCHIVED) {
      return { idempotent: true, status: 'archived' };
    }

    switch (notif.type) {
      case NotificationType.FRIEND_REQUEST:
        return this.acceptFriendRequest(notif);

      default:
        throw new BadRequestException(`Tipo no soportado para accept: ${notif.type}`);
    }
  }

  async reject(userId: string, notificationId: string) {
    const uid = new Types.ObjectId(userId);
    const nid = new Types.ObjectId(notificationId);

    const notif = await this.notifModel.findById(nid).exec();
    if (!notif) throw new NotFoundException('Notificación no existe');
    if (!notif.userId.equals(uid)) throw new ForbiddenException('No puedes operar esta notificación');

    if (notif.status === NotificationStatus.ARCHIVED) {
      return { idempotent: true, status: 'archived' };
    }

    switch (notif.type) {
      case NotificationType.FRIEND_REQUEST:
        return this.rejectFriendRequest(notif);

      default:
        // Rechazar una notificación genérica: solo archivar
        notif.status = NotificationStatus.ARCHIVED;
        await notif.save();

        return { ok: true, action: 'archived' };
    }
  }

  private async acceptFriendRequest(notif: NotificationDocument) {
    const friendshipId = notif.payload?.friendshipId;
    if (!friendshipId) throw new BadRequestException('Notificación sin friendshipId');

    const fid = new Types.ObjectId(friendshipId);
    const friendship = await this.friendshipModel.findById(fid).exec();
    if (!friendship) throw new NotFoundException('Solicitud de amistad no existe');

    // La notificación está en el addressee; verificamos que coincida
    if (!friendship.addresseeId.equals(notif.userId)) {
      throw new ForbiddenException('Solicitud no corresponde a este usuario');
    }

    // Idempotencia por estado
    if (friendship.status === FriendshipStatus.ACCEPTED) {
      // archivar notif (si aún no)
      notif.status = NotificationStatus.ARCHIVED;
      await notif.save();
      return { idempotent: true, status: 'already_accepted' };
    }

    if (friendship.status === FriendshipStatus.BLOCKED) {
      throw new ForbiddenException('No es posible aceptar esta solicitud');
    }

    // Aceptar
    friendship.status = FriendshipStatus.ACCEPTED;
    await friendship.save();

    await this.notifyRequesterFriendAccepted({
        requesterId: friendship.requesterId,
        addresseeId: friendship.addresseeId,
        friendshipId: friendship._id,
    });

    // Archivar la notificación
    notif.status = NotificationStatus.ARCHIVED;
    await notif.save();

    return { ok: true, status: 'accepted', friendshipId: friendship._id };
  }

  private async rejectFriendRequest(notif: NotificationDocument) {
        const friendshipId = notif.payload?.friendshipId;
        if (!friendshipId) throw new BadRequestException('Notificación sin friendshipId');

        const fid = new Types.ObjectId(friendshipId);
        const friendship = await this.friendshipModel.findById(fid).exec();
        if (!friendship) {
        // Si la solicitud ya no existe, igual archivamos
        notif.status = NotificationStatus.ARCHIVED;
        await notif.save();
        return { ok: true, status: 'archived_missing_friendship' };
        }

        if (!friendship.addresseeId.equals(notif.userId)) {
        throw new ForbiddenException('Solicitud no corresponde a este usuario');
        }

        // Idempotencia
        if (friendship.status === FriendshipStatus.REJECTED) {
        notif.status = NotificationStatus.ARCHIVED;
        await notif.save();
        return { idempotent: true, status: 'already_rejected' };
        }

        if (friendship.status === FriendshipStatus.ACCEPTED) {
        // ya son amigos; no “rechazas” algo aceptado, solo archiva notificación
        notif.status = NotificationStatus.ARCHIVED;
        await notif.save();
        return { idempotent: true, status: 'already_accepted' };
        }

        if (friendship.status === FriendshipStatus.BLOCKED) {
        notif.status = NotificationStatus.ARCHIVED;
        await notif.save();
        return { idempotent: true, status: 'blocked' };
        }

        // Rechazar
        friendship.status = FriendshipStatus.REJECTED;
        await friendship.save();

        // Archivar notificación
        notif.status = NotificationStatus.ARCHIVED;
        await notif.save();

        return { ok: true, status: 'rejected', friendshipId: friendship._id };
    }

    private async notifyRequesterFriendAccepted(params: {
    requesterId: Types.ObjectId;
    addresseeId: Types.ObjectId;
    friendshipId: Types.ObjectId;
    }) {
    const addressee = await this.userModel
        .findById(params.addresseeId)
        .select('username displayName')
        .lean()
        .exec();

    const who = addressee?.displayName || addressee?.username || 'Un usuario';

    // Idempotente: evita duplicados si se llama 2 veces por cualquier motivo
    await this.notifModel.updateOne(
        {
        userId: params.requesterId,
        type: NotificationType.FRIEND_REQUEST_ACCEPTED,
        'payload.friendshipId': params.friendshipId,
        },
        {
        $setOnInsert: {
            userId: params.requesterId,
            type: NotificationType.FRIEND_REQUEST_ACCEPTED,
            status: NotificationStatus.UNREAD,
            title: 'Solicitud aceptada',
            body: `${who} aceptó tu solicitud de amistad.`,
            payload: {
            friendshipId: params.friendshipId,
            userId: params.addresseeId,
            },
        },
        },
        { upsert: true },
    );
    }

    private async notifyRequesterFriendRejected(params: {
    requesterId: Types.ObjectId;
    addresseeId: Types.ObjectId;
    friendshipId: Types.ObjectId;
    }) {
    const addressee = await this.userModel
        .findById(params.addresseeId)
        .select('username displayName')
        .lean()
        .exec();

    const who = addressee?.displayName || addressee?.username || 'Un usuario';

    await this.notifModel.updateOne(
        {
        userId: params.requesterId,
        type: NotificationType.FRIEND_REQUEST_REJECTED,
        'payload.friendshipId': params.friendshipId,
        },
        {
        $setOnInsert: {
            userId: params.requesterId,
            type: NotificationType.FRIEND_REQUEST_REJECTED,
            status: NotificationStatus.UNREAD,
            title: 'Solicitud rechazada',
            body: `${who} rechazó tu solicitud de amistad.`,
            payload: {
            friendshipId: params.friendshipId,
            userId: params.addresseeId,
            },
        },
        },
        { upsert: true },
    );
  }
}
