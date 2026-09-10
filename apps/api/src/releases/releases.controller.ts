import { Controller, Get, NotFoundException, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { createReadStream, existsSync, statSync } from 'fs';
import { extname, join, resolve } from 'path';
import { Public } from '../common/decorators/public.decorator';
import { AppConfig } from '../config/configuration';

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.zip': 'application/zip',
  '.exe': 'application/octet-stream',
};

/**
 * Serve os manifestos/artefatos publicados pelo `desktop_updater` (CLI de
 * release do cliente Flutter). Precisa ser público: o updater do app
 * desktop consulta isso sem enviar Bearer token, e roda antes de qualquer
 * login (o `JwtAuthGuard` é global — ver app.module.ts).
 */
@Controller('releases')
export class ReleasesController {
  private readonly releasesDir: string;

  constructor(config: ConfigService<AppConfig, true>) {
    this.releasesDir = resolve(config.get('releases', { infer: true }).dir);
  }

  @Public()
  @Get('*')
  serve(@Req() req: Request, @Res() res: Response): void {
    const requestedPath = req.params[0] ?? '';
    const filePath = resolve(join(this.releasesDir, requestedPath));

    // Nunca deixa o path pedido escapar de `releasesDir` (proteção contra
    // path traversal via "..").
    if (!filePath.startsWith(this.releasesDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      throw new NotFoundException('Arquivo de release não encontrado.');
    }

    const contentType = CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    createReadStream(filePath).pipe(res);
  }
}
