import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  displayName?: string;

  @IsOptional()
  @IsUrl({}, { message: 'avatarUrl precisa ser uma URL válida.' })
  avatarUrl?: string;
}
