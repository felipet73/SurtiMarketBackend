import { ArrayMinSize, IsArray, IsInt, Max, Min } from 'class-validator';

export class SubmitWeeklyQuizDto {
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(3, { each: true })
  answers: number[];
}