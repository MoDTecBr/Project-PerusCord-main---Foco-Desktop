import { IsString, MinLength } from 'class-validator';

export class SendFriendRequestDto {
  @IsString()
  @MinLength(3)
  username!: string;
}
