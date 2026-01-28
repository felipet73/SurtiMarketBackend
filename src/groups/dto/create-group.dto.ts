import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { GroupJoinPolicy, GroupVisibility } from '../schemas/eco-group.schema';

export class CreateGroupDto {
  @IsString() @MinLength(3) @MaxLength(50)
  name: string;

  @IsOptional() @IsString() @MaxLength(200)
  description?: string;

  @IsOptional() @IsEnum(GroupVisibility)
  visibility?: GroupVisibility;

  @IsOptional() @IsEnum(GroupJoinPolicy)
  joinPolicy?: GroupJoinPolicy;
}