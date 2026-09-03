import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateInviteDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxUses?: number;

  @IsOptional()
  @IsInt()
  @Min(60, { message: 'Convite precisa valer por pelo menos 60 segundos.' })
  @Max(60 * 60 * 24 * 30, { message: 'Convite não pode valer por mais de 30 dias.' })
  expiresInSeconds?: number;
}
