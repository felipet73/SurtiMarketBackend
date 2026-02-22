import { IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateChallengeTemplateDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['DAILY', 'WEEKLY', 'ONE_TIME'])
  cadence?: 'DAILY' | 'WEEKLY' | 'ONE_TIME';

  @IsOptional()
  @IsIn(['QUIZ'])
  gameType?: 'QUIZ';

  @IsOptional()
  @IsIn(['waste', 'transport', 'energy', 'water', 'consumption'])
  focusDimension?: 'waste' | 'transport' | 'energy' | 'water' | 'consumption';

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rewardEcoCoins?: number;

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
  cardImagePrompt?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  numQuestions?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}
