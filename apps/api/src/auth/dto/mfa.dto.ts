import { IsString, Length } from 'class-validator';

export class MfaConfirmDto {
  @IsString()
  @Length(6, 6, { message: 'Código TOTP precisa ter 6 dígitos.' })
  code!: string;
}

export class MfaDisableDto {
  @IsString()
  @Length(6, 8)
  code!: string;
}
