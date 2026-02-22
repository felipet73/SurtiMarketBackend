import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDashboardTemplateDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  userPrompt?: string;

  @IsOptional()
  @IsObject()
  jsonSchema?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  weeklyImagePrompt?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  dailyCacheHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  weeklyImageCacheDays?: number;
}
