import { Module } from '@nestjs/common';
import { ServerInvitesController, InvitesJoinController } from './invites.controller';
import { InvitesService } from './invites.service';

@Module({
  controllers: [ServerInvitesController, InvitesJoinController],
  providers: [InvitesService],
})
export class InvitesModule {}
