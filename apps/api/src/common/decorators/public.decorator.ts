import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca uma rota como acessível sem access token (ex: registro, login, refresh). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
