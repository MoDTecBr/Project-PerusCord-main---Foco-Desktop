import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'E-mail inválido.' })
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  @Length(6, 8, { message: 'Código MFA precisa ter 6 dígitos (ou 8 se for código de backup).' })
  mfaCode?: string;
}
