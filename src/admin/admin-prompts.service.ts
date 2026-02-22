import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChallengeTemplate,
  ChallengeTemplateDocument,
} from '../challenges/schemas/challenge-template.schema';
import {
  DashboardPromptTemplate,
  DashboardPromptTemplateDocument,
} from '../dashboard/schemas/dashboard-prompt-template.schema';
import { UpdateChallengeTemplateDto } from './dto/update-challenge-template.dto';
import { UpdateDashboardTemplateDto } from './dto/update-dashboard-template.dto';

@Injectable()
export class AdminPromptsService {
  constructor(
    @InjectModel(ChallengeTemplate.name)
    private readonly challengeTemplateModel: Model<ChallengeTemplateDocument>,
    @InjectModel(DashboardPromptTemplate.name)
    private readonly dashboardTemplateModel: Model<DashboardPromptTemplateDocument>,
  ) {}

  async listChallengeTemplates(activeOnly?: boolean, focusDimension?: string) {
    const filter: Record<string, unknown> = {};
    if (activeOnly === true) filter.isActive = true;
    if (focusDimension) filter.focusDimension = focusDimension;
    return this.challengeTemplateModel.find(filter).sort({ updatedAt: -1, createdAt: -1 }).lean().exec();
  }

  async getChallengeTemplateById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id invalido');
    const item = await this.challengeTemplateModel.findById(id).lean().exec();
    if (!item) throw new NotFoundException('ChallengeTemplate no encontrado');
    return item;
  }

  async updateChallengeTemplate(id: string, dto: UpdateChallengeTemplateDto) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id invalido');
    if (dto.key) {
      const exists = await this.challengeTemplateModel.findOne({ key: dto.key, _id: { $ne: id } }).exec();
      if (exists) throw new ConflictException('key ya registrada');
    }

    const updated = await this.challengeTemplateModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('ChallengeTemplate no encontrado');
    return updated;
  }

  async setChallengeTemplateActive(id: string, value: boolean) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id invalido');
    const updated = await this.challengeTemplateModel
      .findByIdAndUpdate(id, { $set: { isActive: value } }, { new: true })
      .lean()
      .exec();
    if (!updated) throw new NotFoundException('ChallengeTemplate no encontrado');
    return updated;
  }

  async listDashboardTemplates(activeOnly?: boolean) {
    const filter: Record<string, unknown> = {};
    if (activeOnly === true) filter.isActive = true;
    return this.dashboardTemplateModel.find(filter).sort({ updatedAt: -1, createdAt: -1 }).lean().exec();
  }

  async getDashboardTemplateById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id invalido');
    const item = await this.dashboardTemplateModel.findById(id).lean().exec();
    if (!item) throw new NotFoundException('DashboardPromptTemplate no encontrado');
    return item;
  }

  async updateDashboardTemplate(id: string, dto: UpdateDashboardTemplateDto) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id invalido');
    if (dto.key) {
      const exists = await this.dashboardTemplateModel.findOne({ key: dto.key, _id: { $ne: id } }).exec();
      if (exists) throw new ConflictException('key ya registrada');
    }

    const updated = await this.dashboardTemplateModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('DashboardPromptTemplate no encontrado');
    return updated;
  }

  async setDashboardTemplateActive(id: string, value: boolean) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id invalido');
    const updated = await this.dashboardTemplateModel
      .findByIdAndUpdate(id, { $set: { isActive: value } }, { new: true })
      .lean()
      .exec();
    if (!updated) throw new NotFoundException('DashboardPromptTemplate no encontrado');
    return updated;
  }
}
