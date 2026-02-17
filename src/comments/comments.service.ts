import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentChannel, CommentDocument } from './schemas/comment.schema';
import { EcoGroupMember, EcoGroupMemberDocument, MemberStatus } from '../groups/schemas/eco-group-member.schema';
import { Notification, NotificationDocument, NotificationStatus, NotificationType } from '../notifications/schemas/notification.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(EcoGroupMember.name) private memberModel: Model<EcoGroupMemberDocument>,
    @InjectModel(Notification.name) private notifModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async listReceived(userId: string) {
    const me = new Types.ObjectId(userId);
    const comments = await this.commentModel
      .find({
        $or: [{ recipientId: me }, { senderId: me }],
      })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean()
      .exec();

    if (!comments.length) {
      return { total: 0, items: [] };
    }

    const participantIds = Array.from(
      new Set(comments.flatMap((c) => [c.senderId.toString(), c.recipientId.toString()])),
    ).map(
      (id) => new Types.ObjectId(id),
    );
    const users = await this.userModel
      .find({ _id: { $in: participantIds } })
      .select('_id fullName username displayName avatarUrl')
      .lean()
      .exec();

    const userById = new Map(users.map((u) => [u._id.toString(), u]));
    const items = comments.map((c) => {
      const isSentByMe = c.senderId.toString() === me.toString();
      const sender = userById.get(c.senderId.toString());
      const recipient = userById.get(c.recipientId.toString());
      return {
        id: c._id,
        message: c.text,
        sentAt: c.createdAt,
        direction: isSentByMe ? 'sent' : 'received',
        channel: c.channel,
        groupId: c.groupId ?? null,
        sender: sender
          ? {
              id: sender._id,
              fullName: sender.fullName,
              username: sender.username,
              displayName: sender.displayName ?? '',
              avatarUrl: sender.avatarUrl ?? '',
            }
          : {
              id: c.senderId,
              fullName: '',
              username: '',
              displayName: '',
              avatarUrl: '',
            },
        recipient: recipient
          ? {
              id: recipient._id,
              fullName: recipient.fullName,
              username: recipient.username,
              displayName: recipient.displayName ?? '',
              avatarUrl: recipient.avatarUrl ?? '',
            }
          : {
              id: c.recipientId,
              fullName: '',
              username: '',
              displayName: '',
              avatarUrl: '',
            },
      };
    });

    return { total: items.length, items };
  }

  async listWithUser(userId: string, otherUserId: string) {
    if (!Types.ObjectId.isValid(otherUserId)) {
      throw new BadRequestException('userId invalido');
    }

    const me = new Types.ObjectId(userId);
    const other = new Types.ObjectId(otherUserId);
    const comments = await this.commentModel
      .find({
        channel: CommentChannel.USER,
        $or: [
          { senderId: me, recipientId: other },
          { senderId: other, recipientId: me },
        ],
      })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean()
      .exec();

    const users = await this.userModel
      .find({ _id: { $in: [me, other] } })
      .select('_id fullName username displayName avatarUrl')
      .lean()
      .exec();
    const userById = new Map(users.map((u) => [u._id.toString(), u]));

    const items = comments.map((c) => {
      const isSentByMe = c.senderId.toString() === me.toString();
      const sender = userById.get(c.senderId.toString());
      const recipient = userById.get(c.recipientId.toString());
      return {
        id: c._id,
        message: c.text,
        sentAt: c.createdAt,
        direction: isSentByMe ? 'sent' : 'received',
        channel: c.channel,
        groupId: null,
        sender: sender
          ? {
              id: sender._id,
              fullName: sender.fullName,
              username: sender.username,
              displayName: sender.displayName ?? '',
              avatarUrl: sender.avatarUrl ?? '',
            }
          : {
              id: c.senderId,
              fullName: '',
              username: '',
              displayName: '',
              avatarUrl: '',
            },
        recipient: recipient
          ? {
              id: recipient._id,
              fullName: recipient.fullName,
              username: recipient.username,
              displayName: recipient.displayName ?? '',
              avatarUrl: recipient.avatarUrl ?? '',
            }
          : {
              id: c.recipientId,
              fullName: '',
              username: '',
              displayName: '',
              avatarUrl: '',
            },
      };
    });

    return { total: items.length, items };
  }

  async sendToUser(senderId: string, recipientUserId: string, text: string) {
    const sender = new Types.ObjectId(senderId);
    const recipient = new Types.ObjectId(recipientUserId);
    if (sender.equals(recipient)) throw new BadRequestException('No puedes enviarte comentario a ti mismo');

    const [senderUser, recipientUser] = await Promise.all([
      this.userModel.findById(sender).select('_id username displayName').lean().exec(),
      this.userModel.findById(recipient).select('_id').lean().exec(),
    ]);
    if (!senderUser) throw new NotFoundException('Usuario emisor no existe');
    if (!recipientUser) throw new NotFoundException('Usuario destinatario no existe');

    const created = await this.commentModel.create({
      senderId: sender,
      recipientId: recipient,
      channel: CommentChannel.USER,
      text: text.trim(),
    });

    const who = senderUser.displayName || senderUser.username || 'Un usuario';
    await this.notifModel.create({
      userId: recipient,
      type: NotificationType.NEW_COMMENT,
      status: NotificationStatus.UNREAD,
      title: 'Nuevo comentario',
      body: `${who} te envio un comentario.`,
      payload: {
        commentId: created._id,
        senderId: sender,
        channel: CommentChannel.USER,
      },
    });

    return {
      ok: true,
      sent: 1,
      comment: {
        id: created._id,
        senderId: created.senderId,
        recipientId: created.recipientId,
        channel: created.channel,
        text: created.text,
        createdAt: created.createdAt,
      },
    };
  }

  async sendToMyGroup(senderId: string, text: string) {
    const sender = new Types.ObjectId(senderId);
    const membership = await this.memberModel
      .findOne({ userId: sender, status: MemberStatus.ACTIVE })
      .lean()
      .exec();
    if (!membership) throw new BadRequestException('No perteneces a un grupo activo');

    const members = await this.memberModel
      .find({
        groupId: membership.groupId,
        status: MemberStatus.ACTIVE,
        userId: { $ne: sender },
      })
      .select('userId')
      .lean()
      .exec();

    if (!members.length) return { ok: true, sent: 0 };

    const senderUser = await this.userModel.findById(sender).select('username displayName').lean().exec();
    const who = senderUser?.displayName || senderUser?.username || 'Un usuario';
    const cleanText = text.trim();

    const commentsToCreate = members.map((m) => ({
      senderId: sender,
      recipientId: m.userId,
      groupId: membership.groupId,
      channel: CommentChannel.GROUP,
      text: cleanText,
    }));
    const created = await this.commentModel.insertMany(commentsToCreate);

    const notifications = created.map((c) => ({
      userId: c.recipientId,
      type: NotificationType.NEW_COMMENT,
      status: NotificationStatus.UNREAD,
      title: 'Nuevo comentario en tu grupo',
      body: `${who} envio un comentario al grupo.`,
      payload: {
        commentId: c._id,
        senderId: sender,
        groupId: membership.groupId,
        channel: CommentChannel.GROUP,
      },
    }));
    await this.notifModel.insertMany(notifications);

    return { ok: true, sent: created.length };
  }
}
