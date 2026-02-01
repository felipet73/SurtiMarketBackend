import { IsArray, ArrayMinSize, ArrayMaxSize, IsInt, Min, Max } from 'class-validator';

export class UpdatePuzzleStateDto {
  @IsArray()
  @ArrayMinSize(9)
  @ArrayMaxSize(9)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(8, { each: true })
  positions: number[];
}
