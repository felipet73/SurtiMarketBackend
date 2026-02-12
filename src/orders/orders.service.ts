import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { ProductsService } from '../products/products.service';
import { WalletService } from '../wallet/wallet.service';
import { ECOCOIN_VALUE_USD } from '../common/constants/economy';
import { GroupProgressService } from '../groups/group-progress.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly productsService: ProductsService,
    private readonly walletService: WalletService,
    private readonly groupProgress: GroupProgressService,
  ) {}

  private round2(n: number) {
    return Math.round(n * 100) / 100;
  }

  /**
   * Checkout híbrido:
   * - ecoCoins se usan como descuento hasta el % permitido por producto
   * - el faltante se paga con dinero
   */
  async createOrder(userId: string, dto: CreateOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('items vacío');

    // 1) Obtener wallet
    const wallet = await this.walletService.getOrCreate(userId);
    let availableEcoCoins = wallet.ecoCoinsBalance;

    // 2) Cargar productos (y validar)
    const products = await Promise.all(
      dto.items.map(async (it) => {
        const p: any = await this.productsService.findById(it.productId); // devuelve effectivePrice incluido
        return { req: it, product: p };
      }),
    );

    // 3) Preparar items con cálculo de descuentos
    const orderItems: any[] = [];
    let totalMoney = 0;
    let totalEcoCoinsSpent = 0;
    let totalMoneyDiscount = 0;
    let totalMoneyToPay = 0;

    for (const { req, product } of products) {
      if (!product.isActive) throw new BadRequestException(`Producto inactivo: ${product.name}`);
      if (product.stock < req.qty) throw new BadRequestException(`Stock insuficiente: ${product.name}`);

      const unitPrice = Number(product.effectivePrice ?? product.basePrice);
      const itemMoney = unitPrice * req.qty;
      totalMoney += itemMoney;

      // EcoCoins aplicables en este ítem
      const ecoEnabled = product.ecoCoinsEnabled === true;
      const maxPercent = typeof product.maxEcoCoinsDiscountPercent === 'number'
        ? product.maxEcoCoinsDiscountPercent
        : 0.5;

      const maxDiscountMoney = ecoEnabled ? itemMoney * maxPercent : 0;
      const maxEcoCoinsForItem = ecoEnabled ? Math.floor(maxDiscountMoney / ECOCOIN_VALUE_USD) : 0;

      const ecoCoinsSpent = Math.min(availableEcoCoins, maxEcoCoinsForItem);
      const moneyDiscount = ecoCoinsSpent * ECOCOIN_VALUE_USD;
      const moneyToPay = itemMoney - moneyDiscount;

      availableEcoCoins -= ecoCoinsSpent;

      totalEcoCoinsSpent += ecoCoinsSpent;
      totalMoneyDiscount += moneyDiscount;
      totalMoneyToPay += moneyToPay;

      orderItems.push({
        productId: new Types.ObjectId(product._id),
        nameSnapshot: product.name,
        qty: req.qty,
        unitPriceMoney: this.round2(unitPrice),
        ecoCoinsSpent,
        moneyDiscount: this.round2(moneyDiscount),
        moneyToPay: this.round2(moneyToPay),
      });
    }

    totalMoney = this.round2(totalMoney);
    totalMoneyDiscount = this.round2(totalMoneyDiscount);
    totalMoneyToPay = this.round2(totalMoneyToPay);

    // 4) Descontar stock de forma atómica por producto
    // Si algún stock no alcanza, abortamos antes de gastar ecoCoins.
    for (const item of orderItems) {
      // usamos model directo de Product mediante ProductsService? Para hacerlo simple:
      // Vamos a exponer un método en ProductsService para decrementar stock con condición.
      const ok = await this.productsService.decrementStockIfAvailable(item.productId.toString(), item.qty);
      if (!ok) throw new BadRequestException(`Stock insuficiente (race condition): ${item.nameSnapshot}`);
    }

    // 5) Crear orden
    const created = await this.orderModel.create({
      userId: new Types.ObjectId(userId),
      items: orderItems,
      totalMoney,
      totalEcoCoinsSpent,
      totalMoneyDiscount,
      totalMoneyToPay,
      status: OrderStatus.PENDING,
    });

    // 6) Descontar ecoCoins (atómico) y registrar en ledger
    if (totalEcoCoinsSpent > 0) {
      await this.walletService.spendEcoCoinsAtomic({
        userId,
        amount: totalEcoCoinsSpent,
        source: 'ORDER',
        refId: created._id.toString(),
        note: `Descuento en orden ${created._id.toString()}`,
      });
    }

    await this.groupProgress.addPoints({
      userId,
      points: 10,
      eventKey: `ORDER:${created._id.toString()}:${userId}`,
      source: 'ORDER',
    });

    return {
      orderId: created._id,
      status: created.status,
      totals: {
        totalMoney,
        totalEcoCoinsSpent,
        totalMoneyDiscount,
        totalMoneyToPay,
      },
      items: created.items,
    };
  }

  async myOrders(userId: string, page = 1, limit = 20) {
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.orderModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .exec(),
      this.orderModel.countDocuments({ userId: new Types.ObjectId(userId) }).exec(),
    ]);

    return { page: p, limit: l, total, items };
  }
}
