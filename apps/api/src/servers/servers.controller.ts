import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Permission } from '@relay/permissions';
import { ServersService } from './servers.service';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';

@Controller('servers')
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServerDto) {
    return this.serversService.create(user.id, dto);
  }

  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.serversService.listForUser(user.id);
  }

  @Get(':serverId')
  getDetail(@Param('serverId') serverId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.serversService.getDetail(serverId, user.id);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SERVER)
  @Patch(':serverId')
  update(
    @Param('serverId') serverId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateServerDto,
  ) {
    return this.serversService.update(serverId, user.id, dto);
  }

  @Delete(':serverId')
  remove(@Param('serverId') serverId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.serversService.deleteAsOwner(serverId, user.id);
  }
}
