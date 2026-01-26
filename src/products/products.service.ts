import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Types } from 'mongoose';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {}

  async create(dto: CreateProductDto) {
    const exists = await this.productModel.findOne({ sku: dto.sku }).exec();
    if (exists) throw new ConflictException('SKU ya registrado');

    const created = new this.productModel({
      name: dto.name,
      brand: dto.brand,
      category: dto.category,
      description: dto.description,
      images: dto.images ?? [],
      tags: dto.tags ?? [],
      sku: dto.sku,
      basePrice: dto.basePrice,
      stock: dto.stock ?? 0,
      ecoScore: dto.ecoScore ?? 50,
      co2Kg: dto.co2Kg ?? 0,
      badges: dto.badges ?? [],
      ecoCoinsEnabled: dto.ecoCoinsEnabled ?? true,
      maxEcoCoinsDiscountPercent: dto.maxEcoCoinsDiscountPercent ?? 0.5,
      promo: dto.promo
        ? {
            active: dto.promo.active ?? false,
            promoPrice: dto.promo.promoPrice,
            startsAt: dto.promo.startsAt ? new Date(dto.promo.startsAt) : undefined,
            endsAt: dto.promo.endsAt ? new Date(dto.promo.endsAt) : undefined,
          }
        : { active: false },
      reward: dto.reward
        ? {
            active: dto.reward.active ?? false,
            costEcoCoins: dto.reward.costEcoCoins,
            minHabitScore: dto.reward.minHabitScore,
            minCategory: dto.reward.minCategory,
            startsAt: dto.reward.startsAt ? new Date(dto.reward.startsAt) : undefined,
            endsAt: dto.reward.endsAt ? new Date(dto.reward.endsAt) : undefined,
          }
        : { active: false },
      isActive: true,
    });

    return created.save();
  }

  private now() {
    return new Date();
  }

  // Precio efectivo considerando promo activa y vigente
  computeEffectivePrice(p: ProductDocument) {
    const now = this.now();
    const promo = p.promo;
    const promoActive =
      promo?.active &&
      typeof promo.promoPrice === 'number' &&
      promo.promoPrice >= 0 &&
      (!promo.startsAt || promo.startsAt <= now) &&
      (!promo.endsAt || promo.endsAt >= now);

    return promoActive ? promo.promoPrice! : p.basePrice;
  }

  async findAll(params?: {
    q?: string;
    category?: string;
    type?: 'all' | 'promo' | 'reward';
    minEcoScore?: number;
    activeOnly?: boolean;
    page?: number;
    limit?: number;
    sort?: 'new' | 'eco' | 'price';
  }) {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (params?.activeOnly) filter.isActive = true;
    if (params?.category) filter.category = params.category;
    if (typeof params?.minEcoScore === 'number') filter.ecoScore = { $gte: params.minEcoScore };

    // Tipo: promo o reward (catálogo)
    if (params?.type === 'promo') filter['promo.active'] = true;
    if (params?.type === 'reward') filter['reward.active'] = true;

    if (params?.q) {
      filter.$text = { $search: params.q };
    }

    const sort: any =
      params?.sort === 'eco'
        ? { ecoScore: -1, createdAt: -1 }
        : params?.sort === 'price'
          ? { basePrice: 1, createdAt: -1 }
          : { createdAt: -1 };

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter, params?.q ? { score: { $meta: 'textScore' } } : undefined)
        .sort(params?.q ? { score: { $meta: 'textScore' } } : sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    // Enriquecer respuesta con effectivePrice
    const mapped = items.map((p: any) => ({
      ...p.toObject(),
      effectivePrice: this.computeEffectivePrice(p),
    }));

    return { page, limit, total, items: mapped };
  }

  async findById(id: string) {
    const p = await this.productModel.findById(id).exec();
    if (!p) throw new NotFoundException('Producto no encontrado');
    return { ...p.toObject(), effectivePrice: this.computeEffectivePrice(p) };
  }

  async update(id: string, dto: UpdateProductDto) {
    const update: any = { ...dto };

    // Normalizar fechas de promo/reward si vienen
    if (dto.promo) {
      update.promo = {
        active: dto.promo.active ?? false,
        promoPrice: dto.promo.promoPrice,
        startsAt: dto.promo.startsAt ? new Date(dto.promo.startsAt) : undefined,
        endsAt: dto.promo.endsAt ? new Date(dto.promo.endsAt) : undefined,
      };
    }

    if (dto.reward) {
      update.reward = {
        active: dto.reward.active ?? false,
        costEcoCoins: dto.reward.costEcoCoins,
        minHabitScore: dto.reward.minHabitScore,
        minCategory: dto.reward.minCategory,
        startsAt: dto.reward.startsAt ? new Date(dto.reward.startsAt) : undefined,
        endsAt: dto.reward.endsAt ? new Date(dto.reward.endsAt) : undefined,
      };
    }

    const p = await this.productModel.findByIdAndUpdate(id, update, { new: true }).exec();
    if (!p) throw new NotFoundException('Producto no encontrado');

    return { ...p.toObject(), effectivePrice: this.computeEffectivePrice(p) };
  }

  async setActive(id: string, isActive: boolean) {
    const p = await this.productModel.findByIdAndUpdate(id, { isActive }, { new: true }).exec();
    if (!p) throw new NotFoundException('Producto no encontrado');
    return { ...p.toObject(), effectivePrice: this.computeEffectivePrice(p) };
  }

  async setStock(id: string, stock: number) {
    const p = await this.productModel.findByIdAndUpdate(id, { stock }, { new: true }).exec();
    if (!p) throw new NotFoundException('Producto no encontrado');
    return { ...p.toObject(), effectivePrice: this.computeEffectivePrice(p) };
  }

  // Recomendaciones por reglas (sin IA)
  async recommend(params?: { limit?: number; promoBoost?: boolean }) {
    const limit = Math.min(50, Math.max(1, params?.limit ?? 10));
    const now = this.now();

    // Se prioriza: ecoScore alto + promo activa + disponibles (stock > 0) + activos
    const items = await this.productModel
      .find({
        isActive: true,
        stock: { $gt: 0 },
      })
      .sort({ ecoScore: -1, createdAt: -1 })
      .limit(100)
      .exec();

    const scored = items.map((p) => {
      const eff = this.computeEffectivePrice(p);

      const promoActive =
        p.promo?.active &&
        typeof p.promo.promoPrice === 'number' &&
        (!p.promo.startsAt || p.promo.startsAt <= now) &&
        (!p.promo.endsAt || p.promo.endsAt >= now);

      // Score simple y explicable
      let score = p.ecoScore * 10;
      if (promoActive && params?.promoBoost !== false) score += 200;
      if (p.reward?.active) score += 50;
      if (p.stock > 20) score += 10;

      return { p, score, effectivePrice: eff, promoActive };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((x) => ({
      ...x.p.toObject(),
      effectivePrice: x.effectivePrice,
      recommendationScore: x.score,
    }));
  }

  async decrementStockIfAvailable(productId: string, qty: number): Promise<boolean> {
    const res = await this.productModel
        .findOneAndUpdate(
        { _id: new Types.ObjectId(productId), isActive: true, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true },
        )
        .exec();

    return !!res;
   }
}
