import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';

function looksLikeEmail(q: string) {
  return q.includes('@');
}

function maskEmail(email: string) {
  const [u, d] = email.split('@');
  if (!u || !d) return email;
  const head = u.slice(0, 2);
  return `${head}****@${d}`;
}

@Injectable()
export class CommunityService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async searchUsers(requesterId: string, q: string) {
    const query = (q ?? '').trim();
    if (query.length < 2) throw new BadRequestException('q muy corto');

    const isEmail = looksLikeEmail(query);
    const uid = new Types.ObjectId(requesterId);

    // Nota: MVP -> no mostramos al propio usuario
    // Privacidad MVP: PRIVATE no aparece. Si q es email, requiere emailSearchable=true.
    const filter: any = {
      _id: { $ne: uid },
      'privacy.profileVisibility': { $ne: 'PRIVATE' },
    };

    // buscar por email o username (case-insensitive)
    if (isEmail) {
      filter.email = query.toLowerCase();
      filter['privacy.emailSearchable'] = true;
    } else {
      filter.$or = [
        { username: new RegExp(`^${escapeRegExp(query)}`, 'i') },
        { displayName: new RegExp(escapeRegExp(query), 'i') },
      ];
    }

    const users = await this.userModel
      .find(filter)
      .select('_id username displayName email avatarUrl privacy')
      .limit(20)
      .lean()
      .exec();

    // Respuesta segura: NO devolver email real
    return users.map((u: any) => ({
      id: u._id,
      username: u.username,
      displayName: u.displayName ?? u.username,
      avatarUrl: u.avatarUrl ?? null,
      // email solo si fue búsqueda por email y permitido; igual enmascarado
      emailMasked: u.email ? maskEmail(u.email) : null,
      profileVisibility: u.privacy?.profileVisibility ?? 'COMMUNITY',
      canRequestFriend: (u.privacy?.friendRequests ?? 'ANYONE') !== 'NOBODY',
    }));
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}