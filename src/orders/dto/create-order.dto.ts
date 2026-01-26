import { IsArray, IsInt, IsMongoId, Min } from 'class-validator';

export class CreateOrderItemDto {
  @IsMongoId()
  productId: string;

  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateOrderDto {
  @IsArray()
  items: CreateOrderItemDto[];
}