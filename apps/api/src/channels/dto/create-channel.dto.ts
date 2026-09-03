import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ChannelType } from '@prisma/client';

export class CreateChannelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(ChannelType, { message: 'type precisa ser TEXT, VOICE ou VIDEO.' })
  type!: ChannelType;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  topic?: string;
}
