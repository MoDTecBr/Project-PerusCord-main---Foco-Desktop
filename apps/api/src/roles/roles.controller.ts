import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Permission } from '@relay/permissions';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@UseGuards(PermissionsGuard)
@RequirePermissions(Permission.MANAGE_ROLES)
@Controller('servers/:serverId')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post('roles')
  create(
    @Param('serverId') serverId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
  ) {
    return this.rolesService.create(serverId, user.id, dto);
  }

  @Patch('roles/:roleId')
  update(
    @Param('serverId') serverId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(serverId, roleId, user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('roles/:roleId')
  async remove(
    @Param('serverId') serverId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.rolesService.delete(serverId, roleId, user.id);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('members/:memberId/roles/:roleId')
  async assign(
    @Param('serverId') serverId: string,
    @Param('memberId') memberId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.rolesService.assignToMember(serverId, memberId, roleId, user.id);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('members/:memberId/roles/:roleId')
  async unassign(
    @Param('serverId') serverId: string,
    @Param('memberId') memberId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.rolesService.removeFromMember(serverId, memberId, roleId, user.id);
  }
}
