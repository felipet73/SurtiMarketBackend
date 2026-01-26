import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  brand?: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsArray()
  images?: string[];

  @IsOptional() @IsArray()
  tags?: string[];

  @IsString()
  sku: string;

  @IsNumber() @Min(0)
  basePrice: number;

  @IsOptional() @IsNumber() @Min(0)
  stock?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(100)
  ecoScore?: number;

  @IsOptional() @IsNumber() @Min(0)
  co2Kg?: number;

  @IsOptional() @IsArray()
  badges?: string[];

  @IsOptional() @IsBoolean()
  ecoCoinsEnabled?: boolean;

  @IsOptional() @IsNumber() @Min(0) @Max(1)
  maxEcoCoinsDiscountPercent?: number;

  @IsOptional() @IsObject()
  promo?: {
    active?: boolean;
    promoPrice?: number;
    startsAt?: string;
    endsAt?: string;
  };

  @IsOptional() @IsObject()
  reward?: {
    active?: boolean;
    costEcoCoins?: number;
    minHabitScore?: number;
    minCategory?: string;
    startsAt?: string;
    endsAt?: string;
  };
}