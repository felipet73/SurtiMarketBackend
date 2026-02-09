import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export enum Dimension {
  WASTE = 'waste',
  TRANSPORT = 'transport',
  ENERGY = 'energy',
  WATER = 'water',
  CONSUMPTION = 'consumption',
}

export enum EcoImpactEventType {
  STREAK = 'STREAK',
  QUIZ = 'QUIZ',
  PURCHASE = 'PURCHASE',
  CHALLENGE = 'CHALLENGE',
}

export class Radar5Dto {
  @IsNumber()
  @Min(0)
  @Max(10)
  waste: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  transport: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  energy: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  water: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  consumption: number;
}

export class EcoImpactEventDto {
  @IsEnum(EcoImpactEventType)
  type: EcoImpactEventType;

  @IsOptional()
  @IsEnum(Dimension)
  dimension?: Dimension;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3)
  delta?: number;
}

export class LeaderboardQueryDto {
  @IsOptional()
  @IsString()
  weekKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;
}

export class CompareQueryDto {
  @IsOptional()
  @IsString()
  weekKey?: string;

  @IsString()
  groupIds: string; // csv
}

export class ProgressQueryDto {
  @IsOptional()
  @IsString()
  weekKey?: string;
}
