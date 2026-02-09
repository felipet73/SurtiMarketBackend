import { IsMongoId } from 'class-validator';

export class InviteUserDto {
  @IsMongoId()
  userId: string;
}
