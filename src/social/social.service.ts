import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Friendship, FriendshipDocument, FriendshipStatus } from './schemas/friendship.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Notification, NotificationDocument, NotificationStatus, NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class SocialService {
  constructor(
    @InjectModel(Friendship.name) private friendshipModel: Model<FriendshipDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Notification.name) private notifModel: Model<NotificationDocument>,
  ) {}

  async requestFriend(requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) throw new BadRequestException('No puedes agregarte a ti mismo');

    const reqId = new Types.ObjectId(requesterId);
    const tgtId = new Types.ObjectId(targetUserId);

    const target = await this.userModel.findById(tgtId).select('privacy username displayName').lean().exec();
    if (!target) throw new NotFoundException('Usuario no existe');

    const policy = target.privacy?.friendRequests ?? 'ANYONE';
    if (policy === 'NOBODY') throw new ForbiddenException('Este usuario no acepta solicitudes de amistad');

    // Buscar relación existente en ambas direcciones
    const existing = await this.friendshipModel.findOne({
      $or: [
        { requesterId: reqId, addresseeId: tgtId },
        { requesterId: tgtId, addresseeId: reqId },
      ],
    }).exec();

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        return { status: 'already_friends' };
      }
      if (existing.status === FriendshipStatus.PENDING) {
        return { status: 'already_pending' };
      }
      if (existing.status === FriendshipStatus.BLOCKED) {
        throw new ForbiddenException('No es posible enviar solicitud');
      }
      // REJECTED -> permitir nueva solicitud creando otra en dirección requester->target
      // Para simplificar MVP: si existe REJECTED, lo actualizamos a PENDING si requester es el mismo.
      if (existing.status === FriendshipStatus.REJECTED) {
        // Normalizamos: que requester sea el que envía ahora
        existing.requesterId = reqId;
        existing.addresseeId = tgtId;
        existing.status = FriendshipStatus.PENDING;
        await existing.save();
        await this.createFriendRequestNotification(tgtId, reqId, existing._id, target);
        return { status: 'requested', friendshipId: existing._id };
      }
    }

    const friendship = await this.friendshipModel.create({
      requesterId: reqId,
      addresseeId: tgtId,
      status: FriendshipStatus.PENDING,
    });

    await this.createFriendRequestNotification(tgtId, reqId, friendship._id, target);

    return { status: 'requested', friendshipId: friendship._id };
  }

  private async createFriendRequestNotification(
    targetUserId: Types.ObjectId,
    requesterId: Types.ObjectId,
    friendshipId: Types.ObjectId,
    targetUser: any,
  ) {
    // Nota: el title/body puede venir de IA después, por ahora hardcode limpio.
    await this.notifModel.create({
      userId: targetUserId,
      type: NotificationType.FRIEND_REQUEST,
      status: NotificationStatus.UNREAD,
      title: 'Nueva solicitud de amistad',
      body: 'Tienes una solicitud de amistad pendiente.',
      payload: {
        friendshipId,
        requesterId,
      },
    });
  }
}