import { IsDateString, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SetPromoDiscountDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
