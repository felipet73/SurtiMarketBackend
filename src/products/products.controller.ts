import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SetPromoDiscountDto } from './dto/set-promo-discount.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/role.decorator';
import { Role } from '../common/enums/role.enum';
import { FilesInterceptor } from '@nestjs/platform-express';
import { promises as fs } from 'fs';
import { extname, join } from 'path';

type UploadedProductImage = {
  size: number;
  mimetype: string;
  originalname: string;
  buffer: Buffer;
};

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // CLIENT: lectura (pública o con auth si prefieres)
  @Get()
  async list(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('type') type?: 'all' | 'promo' | 'reward',
    @Query('minEcoScore') minEcoScore?: string,
    @Query('activeOnly') activeOnly?: string,
    @Query('sort') sort?: 'new' | 'eco' | 'price',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.products.findAll({
      q,
      category,
      type: type ?? 'all',
      minEcoScore: minEcoScore ? Number(minEcoScore) : undefined,
      activeOnly: activeOnly === 'true',
      sort: sort ?? 'new',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('recommendations')
  async recommendations(@Query('limit') limit?: string) {
    return this.products.recommend({ limit: limit ? Number(limit) : 10 });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.products.findById(id);
  }

  // EMPLOYEE/ADMIN: crear producto
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  // EMPLOYEE/ADMIN: actualizar
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  // ADMIN: activar/desactivar
  @Patch(':id/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  setActive(@Param('id') id: string, @Query('value') value: string) {
    return this.products.setActive(id, value === 'true');
  }

  // ADMIN: activar producto (isActive=true)
  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  activate(@Param('id') id: string) {
    return this.products.setActive(id, true);
  }

  // EMPLOYEE/ADMIN: stock
  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  setStock(@Param('id') id: string, @Query('value') value: string) {
    return this.products.setStock(id, Number(value));
  }

  // ADMIN: soft delete (isActive=false)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  softDelete(@Param('id') id: string) {
    return this.products.softDelete(id);
  }

  // EMPLOYEE/ADMIN: detener promocion (desactivar y borrar precio promo)
  @Patch(':id/promo/stop')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  stopPromotion(@Param('id') id: string) {
    return this.products.stopPromotion(id);
  }

  // EMPLOYEE/ADMIN: establecer promocion por porcentaje
  @Patch(':id/promo/discount')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  setPromotionByDiscount(@Param('id') id: string, @Body() dto: SetPromoDiscountDto) {
    return this.products.setPromotionByDiscount(id, dto.discountPercent, dto.startsAt, dto.endsAt);
  }

  // ADMIN: agregar imagenes al producto y guardar URLs en images[]
  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files?: UploadedProductImage[],
  ) {
    if (!files?.length) throw new BadRequestException('Debes enviar al menos una imagen en "files"');

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const dir = join(process.cwd(), 'public', 'products', id);
    await fs.mkdir(dir, { recursive: true });

    const urls: string[] = [];
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) {
        throw new BadRequestException('Cada imagen debe ser menor o igual a 8MB');
      }
      if (!allowed.has(file.mimetype)) {
        throw new BadRequestException('Formato no permitido. Usa JPG, PNG o WEBP');
      }

      const safeExt = extname(file.originalname || '').toLowerCase();
      const ext = safeExt && ['.jpg', '.jpeg', '.png', '.webp'].includes(safeExt) ? safeExt : '.jpg';
      const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
      const fullPath = join(dir, fileName);

      await fs.writeFile(fullPath, file.buffer);
      urls.push(`${publicBaseUrl}/public/products/${id}/${fileName}`);
    }

    return this.products.addImages(id, urls);
  }
}
