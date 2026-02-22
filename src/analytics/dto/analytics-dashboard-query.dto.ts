import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AnalyticsDashboardQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsString()
  tz?: string;
}
