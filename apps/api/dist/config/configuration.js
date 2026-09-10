"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
    }
    return value;
}
exports.default = () => ({
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
    database: {
        url: required('DATABASE_URL'),
    },
    redis: {
        url: required('REDIS_URL'),
    },
    jwt: {
        accessSecret: required('JWT_ACCESS_SECRET'),
        accessTtlSeconds: parseInt(process.env.JWT_ACCESS_TTL_SECONDS ?? '900', 10),
        refreshTtlSeconds: parseInt(process.env.JWT_REFRESH_TTL_SECONDS ?? '2592000', 10),
    },
    argon2: {
        memoryCostKib: parseInt(process.env.ARGON2_MEMORY_COST_KIB ?? '19456', 10),
        timeCost: parseInt(process.env.ARGON2_TIME_COST ?? '2', 10),
        parallelism: parseInt(process.env.ARGON2_PARALLELISM ?? '1', 10),
    },
    rateLimit: {
        authTtlSeconds: parseInt(process.env.AUTH_RATE_LIMIT_TTL_SECONDS ?? '60', 10),
        authLimit: parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '10', 10),
    },
    livekit: {
        url: process.env.LIVEKIT_URL ?? 'ws://localhost:7880',
        apiKey: process.env.LIVEKIT_API_KEY ?? 'devkey',
        apiSecret: process.env.LIVEKIT_API_SECRET ?? 'troque-por-um-segredo-de-pelo-menos-32-caracteres',
    },
    s3: {
        endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
        publicUrl: process.env.S3_PUBLIC_URL ?? process.env.S3_ENDPOINT ?? 'http://localhost:9000',
        accessKey: process.env.S3_ACCESS_KEY ?? 'relay',
        secretKey: process.env.S3_SECRET_KEY ?? 'relay_dev_password',
        bucket: process.env.S3_BUCKET ?? 'relay-uploads',
    },
    releases: {
        dir: process.env.RELEASES_DIR ?? (0, path_1.join)(process.cwd(), 'releases'),
    },
});
//# sourceMappingURL=configuration.js.map