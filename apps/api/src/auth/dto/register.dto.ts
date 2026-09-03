import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'E-mail inválido.' })
  email!: string;

  @IsString()
  @MinLength(3, { message: 'Nome de usuário precisa ter ao menos 3 caracteres.' })
  @MaxLength(32)
  @Matches(/^[a-z0-9_.]+$/, {
    message: 'Nome de usuário só pode conter letras minúsculas, números, "_" e ".".',
  })
  username!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  displayName!: string;

  @IsString()
  @MinLength(12, { message: 'Senha precisa ter ao menos 12 caracteres.' })
  @MaxLength(256)
  password!: string;
}
