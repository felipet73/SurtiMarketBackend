import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async createUser(params: {
    fullName: string;
    email: string;
    passwordHash: string;
    roles?: Role[];
  }) {
    const exists = await this.findByEmail(params.email);
    if (exists) throw new ConflictException('Email ya registrado');

    const created = new this.userModel({
      fullName: params.fullName,
      email: params.email.toLowerCase(),
      passwordHash: params.passwordHash,
      roles: params.roles?.length ? params.roles : [Role.CLIENT],
      isActive: true,
    });

    return created.save();
  }

  async findPublicById(id: string) {
    const user = await this.userModel
        .findById(id)
        .select('-passwordHash') // excluye hash
        .exec();

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async listUsers(params?: { page?: number; limit?: number; q?: string }) {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (params?.q) {
        const q = params.q.trim();
        filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        ];
    }

    const [items, total] = await Promise.all([
        this.userModel
        .find(filter)
        .select('-passwordHash') // clave
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
        this.userModel.countDocuments(filter).exec(),
    ]);

    return {
        page,
        limit,
        total,
        items,
    };
    }
}
