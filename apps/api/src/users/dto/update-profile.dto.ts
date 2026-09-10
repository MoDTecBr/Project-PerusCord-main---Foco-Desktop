import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  displayName?: string;

  // Antes usava @IsUrl(), que por padrão exige um domínio com TLD e rejeita
  // hosts por IP puro — nossas URLs de upload (MinIO) apontam pro IP do
  // servidor, então todo upload de avatar caía nessa validação com "avatarUrl
  // precisa ser uma URL válida" mesmo sendo uma URL legítima. Como essa URL
  // sempre vem do nosso próprio endpoint /uploads (nunca digitada pelo
  // usuário), uma checagem de string simples já é suficiente.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(190)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  customStatus?: string;
}
