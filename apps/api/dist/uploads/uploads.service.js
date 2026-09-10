"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UploadsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const minio_1 = require("minio");
const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = {
    'image/png': (buf) => buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47,
    'image/jpeg': (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
    'image/gif': (buf) => buf.length >= 6 && buf.subarray(0, 3).toString('ascii') === 'GIF',
    'image/webp': (buf) => buf.length >= 12 &&
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WEBP',
};
let UploadsService = UploadsService_1 = class UploadsService {
    logger = new common_1.Logger(UploadsService_1.name);
    client;
    s3Config;
    constructor(config) {
        this.s3Config = config.get('s3', { infer: true });
        const endpoint = new URL(this.s3Config.endpoint);
        this.client = new minio_1.Client({
            endPoint: endpoint.hostname,
            port: endpoint.port ? Number(endpoint.port) : endpoint.protocol === 'https:' ? 443 : 80,
            useSSL: endpoint.protocol === 'https:',
            accessKey: this.s3Config.accessKey,
            secretKey: this.s3Config.secretKey,
        });
    }
    async onModuleInit() {
        try {
            const exists = await this.client.bucketExists(this.s3Config.bucket);
            if (!exists) {
                await this.client.makeBucket(this.s3Config.bucket);
            }
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
        }
        catch (error) {
            this.logger.error('Não foi possível preparar o bucket de uploads — envio de arquivos vai falhar.', error instanceof Error ? error.stack : String(error));
        }
    }
    async uploadImage(file) {
        if (file.size > MAX_SIZE_BYTES) {
            throw new common_1.BadRequestException('Arquivo maior que 8MB.');
        }
        const validator = ALLOWED_IMAGE_TYPES[file.mimetype];
        if (!validator) {
            throw new common_1.BadRequestException('Tipo de arquivo não suportado. Envie PNG, JPEG, GIF ou WEBP.');
        }
        if (!validator(file.buffer)) {
            throw new common_1.BadRequestException('O conteúdo do arquivo não bate com o tipo declarado.');
        }
        const extension = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'bin';
        const objectName = `${(0, crypto_1.randomUUID)()}.${extension}`;
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
};
exports.UploadsService = UploadsService;
exports.UploadsService = UploadsService = UploadsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UploadsService);
//# sourceMappingURL=uploads.service.js.map