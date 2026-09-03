import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Permission } from '@relay/permissions';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';

@UseGuards(PermissionsGuard)
@RequirePermissions(Permission.CREATE_INVITE)
@Controller('servers/:serverId/invites')
export class ServerInvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  create(
    @Param('serverId') serverId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInviteDto,
  ) {
    return this.invitesService.create(serverId, user.id, dto);
  }

  @Get()
  list(@Param('serverId') serverId: string) {
    return this.invitesService.listForServer(serverId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':inviteId')
  async remove(
    @Param('serverId') serverId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.invitesService.delete(serverId, inviteId, user.id);
  }
}

@Controller('invites')
export class InvitesJoinController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post(':code/join')
  join(@Param('code') code: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invitesService.joinByCode(code, user.id);
  }
}
