import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Permission } from '@relay/permissions';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ChannelsService } from './channels.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@UseGuards(PermissionsGuard)
@Controller()
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @RequirePermissions(Permission.MANAGE_CHANNELS)
  @Post('servers/:serverId/categories')
  createCategory(
    @Param('serverId') serverId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.channelsService.createCategory(serverId, user.id, dto);
  }

  @RequirePermissions(Permission.MANAGE_CHANNELS)
  @Delete('categories/:categoryId')
  deleteCategory(@Param('categoryId') categoryId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.channelsService.deleteCategory(categoryId, user.id);
  }

  @RequirePermissions(Permission.MANAGE_CHANNELS)
  @Post('servers/:serverId/channels')
  createChannel(
    @Param('serverId') serverId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelsService.createChannel(serverId, user.id, dto);
  }

  @RequirePermissions(Permission.MANAGE_CHANNELS)
  @Patch('channels/:channelId')
  updateChannel(
    @Param('channelId') channelId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channelsService.updateChannel(channelId, user.id, dto);
  }

  @RequirePermissions(Permission.MANAGE_CHANNELS)
  @Delete('channels/:channelId')
  deleteChannel(@Param('channelId') channelId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.channelsService.deleteChannel(channelId, user.id);
  }
}
