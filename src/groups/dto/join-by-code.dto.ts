import { IsString, MinLength } from 'class-validator';

export class JoinByCodeDto {
  @IsString() @MinLength(4)
  code: string;
}