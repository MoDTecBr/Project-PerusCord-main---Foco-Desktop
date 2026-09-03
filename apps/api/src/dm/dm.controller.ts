import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DmService } from './dm.service';

@Controller('dm')
export class DmController {
  constructor(private readonly dm: DmService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.dm.listForUser(user.id);
  }

  @Post(':username')
  getOrCreate(@Param('username') username: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dm.getOrCreateWithFriend(user.id, username);
  }
}
