import { IsMongoId } from 'class-validator';

export class FriendRequestDto {
  @IsMongoId()
  targetUserId: string;
}