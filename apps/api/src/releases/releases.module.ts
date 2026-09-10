import { Module } from '@nestjs/common';
import { ReleasesController } from './releases.controller';

@Module({
  controllers: [ReleasesController],
})
export class ReleasesModule {}
