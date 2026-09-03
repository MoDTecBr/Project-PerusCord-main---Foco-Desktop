export interface AppConfig {
  env: string;
  port: number;
  corsOrigins: string[];
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    accessSecret: string;
    accessTtlSeconds: number;
    refreshTtlSeconds: number;
  };
  argon2: {
    memoryCostKib: number;
    timeCost: number;
    parallelism: number;
  };
  rateLimit: {
    authTtlSeconds: number;
    authLimit: number;
  };
  livekit: {
    url: string;
    apiKey: string;
    apiSecret: string;
  };
  s3: {
    endpoint: string;
    publicUrl: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export default (): AppConfig => ({
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
    accessTtlSeconds: parseInt(process.env.JWT_ACCESS_TTL_SECONDS ?? '900', 10), // 15 min
    refreshTtlSeconds: parseInt(process.env.JWT_REFRESH_TTL_SECONDS ?? '2592000', 10), // 30 dias
  },
  argon2: {
    memoryCostKib: parseInt(process.env.ARGON2_MEMORY_COST_KIB ?? '19456', 10), // ~19 MiB
    timeCost: parseInt(process.env.ARGON2_TIME_COST ?? '2', 10),
    parallelism: parseInt(process.env.ARGON2_PARALLELISM ?? '1', 10),
  },
  rateLimit: {
    authTtlSeconds: parseInt(process.env.AUTH_RATE_LIMIT_TTL_SECONDS ?? '60', 10),
    authLimit: parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '10', 10),
  },
  livekit: {
    // Os defaults abaixo têm que bater com infra/docker/livekit.yaml — só
    // para dev local, nunca usar chave/segredo fixos em produção.
    url: process.env.LIVEKIT_URL ?? 'ws://localhost:7880',
    apiKey: process.env.LIVEKIT_API_KEY ?? 'devkey',
    apiSecret: process.env.LIVEKIT_API_SECRET ?? 'troque-por-um-segredo-de-pelo-menos-32-caracteres',
  },
  s3: {
    // `endpoint` é o que o BACKEND usa para falar com o MinIO (interno).
    // `publicUrl` é o que vai dentro da URL devolvida ao cliente — precisa
    // ser um endereço que o app consiga alcançar (ex: o IP do Radmin VPN).
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    publicUrl: process.env.S3_PUBLIC_URL ?? process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    accessKey: process.env.S3_ACCESS_KEY ?? 'relay',
    secretKey: process.env.S3_SECRET_KEY ?? 'relay_dev_password',
    bucket: process.env.S3_BUCKET ?? 'relay-uploads',
  },
});
