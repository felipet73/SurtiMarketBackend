import { IsInt } from 'class-validator';

export class MovePuzzleDto {
  @IsInt()
  tileIndex: number;
}