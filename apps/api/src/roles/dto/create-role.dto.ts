import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(0xffffff)
  color?: number;

  /** Bitfield de permissões como string decimal (BigInt não é representável em JSON). */
  @IsString()
  @Matches(/^\d+$/, { message: 'permissions precisa ser uma string numérica (bitfield).' })
  permissions!: string;
}
