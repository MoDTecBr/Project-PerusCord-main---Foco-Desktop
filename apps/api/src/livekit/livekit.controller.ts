import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { LivekitService } from './livekit.service';

@Controller('channels/:channelId/voice-token')
export class LivekitController {
  constructor(private readonly livekit: LivekitService) {}

  @Post()
  mintToken(@Param('channelId') channelId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.livekit.mintVoiceToken(channelId, user.id);
  }
}

@Controller('servers/:serverId/voice-presence')
export class VoicePresenceController {
  constructor(private readonly livekit: LivekitService) {}

  @Get()
  get(@Param('serverId') serverId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.livekit.getVoicePresence(serverId, user.id);
  }
}
