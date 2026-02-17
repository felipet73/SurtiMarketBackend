import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendCommentToUserDto {
  @IsMongoId()
  recipientUserId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text: string;
}

export class SendCommentToGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text: string;
}
