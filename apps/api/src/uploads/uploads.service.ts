import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Client as MinioClient } from 'minio';
import { AppConfig } from '../config/configuration';

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

/**
 * Confere a ASSINATURA (magic bytes) real do arquivo — nunca confia só no
 * `mimetype` declarado pelo cliente, que é fácil de falsificar.
 */
const ALLOWED_IMAGE_TYPES: Record<string, (buf: Buffer) => boolean> = {
  'image/png': (buf) =>
    buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47,
  'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  'image/gif': (buf) => buf.length >= 6 && buf.subarray(0, 3).toString('ascii') === 'GIF',
  'image/webp': (buf) =>
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP',
};

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface UploadedFileLike {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private readonly client: MinioClient;
  private readonly s3Config: AppConfig['s3'];

  constructor(config: ConfigService<AppConfig, true>) {
    this.s3Config = config.get('s3', { infer: true });
    const endpoint = new URL(this.s3Config.endpoint);
    this.client = new MinioClient({
      endPoint: endpoint.hostname,
      port: endpoint.port ? Number(endpoint.port) : endpoint.protocol === 'https:' ? 443 : 80,
      useSSL: endpoint.protocol === 'https:',
      accessKey: this.s3Config.accessKey,
      secretKey: this.s3Config.secretKey,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.s3Config.bucket);
      if (!exists) {
        await this.client.makeBucket(this.s3Config.bucket);
      }
      // Leitura pública simplifica servir imagem direto por URL neste estágio
      // do projeto — produção de verdade trocaria isso por URLs assinadas.
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.s3Config.bucket}/*`],
          },
        ],
      };
      await this.client.setBucketPolicy(this.s3Config.bucket, JSON.stringify(policy));
    } catch (error) {
      this.logger.error(
        'Não foi possível preparar o bucket de uploads — envio de arquivos vai falhar.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async uploadImage(file: UploadedFileLike): Promise<UploadResult> {
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('Arquivo maior que 8MB.');
    }

    const validator = ALLOWED_IMAGE_TYPES[file.mimetype];
    if (!validator) {
      throw new BadRequestException('Tipo de arquivo não suportado. Envie PNG, JPEG, GIF ou WEBP.');
    }
    if (!validator(file.buffer)) {
      throw new BadRequestException('O conteúdo do arquivo não bate com o tipo declarado.');
    }

    const extension = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'bin';
    const objectName = `${randomUUID()}.${extension}`;

    await this.client.putObject(this.s3Config.bucket, objectName, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    return {
      url: `${this.s3Config.publicUrl}/${this.s3Config.bucket}/${objectName}`,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}
