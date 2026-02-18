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
    username: string;
    email: string;    
    passwordHash: string;
    roles?: Role[];
  }) {
    const exists = await this.findByEmail(params.email);
    if (exists) throw new ConflictException('Email ya registrado');

    const created = new this.userModel({
      fullName: params.fullName,
      email: params.email.toLowerCase(),
      username: params.username,
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

  async updateProfile(
    id: string,
    updates: {
      fullName?: string;
      username?: string;
      displayName?: string;
      avatarUrl?: string;
      privacy?: Record<string, any>;
      email?: string;
      roles?: Role[];
      isActive?: boolean;
    },
  ) {
    const setUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) setUpdates[key] = value;
    }

    if (setUpdates.email) {
      const email = String(setUpdates.email).toLowerCase();
      const exists = await this.userModel.findOne({ email, _id: { $ne: id } }).exec();
      if (exists) throw new ConflictException('Email ya registrado');
      setUpdates.email = email;
    }

    if (setUpdates.username) {
      const exists = await this.userModel
        .findOne({ username: setUpdates.username, _id: { $ne: id } })
        .exec();
      if (exists) throw new ConflictException('Username ya registrado');
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: setUpdates }, { new: true })
      .exec();

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async findEmployeeById(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-passwordHash')
      .exec();

    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.roles?.includes(Role.EMPLOYEE)) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return user;
  }

  async updateUserByAdmin(
    id: string,
    updates: {
      fullName?: string;
      username?: string;
      displayName?: string;
      avatarUrl?: string;
      email?: string;
      roles?: Role[];
      isActive?: boolean;
    },
  ) {
    const setUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) setUpdates[key] = value;
    }

    if (setUpdates.email) {
      const email = String(setUpdates.email).toLowerCase();
      const exists = await this.userModel.findOne({ email, _id: { $ne: id } }).exec();
      if (exists) throw new ConflictException('Email ya registrado');
      setUpdates.email = email;
    }

    if (setUpdates.username) {
      const exists = await this.userModel
        .findOne({ username: setUpdates.username, _id: { $ne: id } })
        .exec();
      if (exists) throw new ConflictException('Username ya registrado');
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: setUpdates }, { new: true })
      .exec();

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async deactivateUserByAdmin(id: string) {
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true })
      .exec();

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
