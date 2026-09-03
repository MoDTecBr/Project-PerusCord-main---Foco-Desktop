import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfig } from '../config/configuration';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(config: ConfigService<AppConfig, true>) {
    super(config.get('redis', { infer: true }).url);
  }

  onModuleDestroy(): void {
    this.disconnect();
  }
}
