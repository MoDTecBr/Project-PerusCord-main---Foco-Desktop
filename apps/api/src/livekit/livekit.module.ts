import { Module } from '@nestjs/common';
import { LivekitController, VoicePresenceController } from './livekit.controller';
import { LivekitService } from './livekit.service';

@Module({
  controllers: [LivekitController, VoicePresenceController],
  providers: [LivekitService],
})
export class LivekitModule {}
