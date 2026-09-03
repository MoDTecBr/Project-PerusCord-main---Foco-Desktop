import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get()
  listFriends(@CurrentUser() user: AuthenticatedUser) {
    return this.friends.listFriends(user.id);
  }

  @Get('requests')
  listPending(@CurrentUser() user: AuthenticatedUser) {
    return this.friends.listPending(user.id);
  }

  @Post('requests')
  sendRequest(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendFriendRequestDto) {
    return this.friends.sendRequest(user.id, dto);
  }

  @Post('requests/:friendshipId/accept')
  accept(@Param('friendshipId') friendshipId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.friends.respond(user.id, friendshipId, true);
  }

  @Post('requests/:friendshipId/decline')
  decline(@Param('friendshipId') friendshipId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.friends.respond(user.id, friendshipId, false);
  }

  @Post('block')
  block(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendFriendRequestDto) {
    return this.friends.block(user.id, dto.username);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':friendshipId')
  async remove(
    @Param('friendshipId') friendshipId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.friends.remove(user.id, friendshipId);
  }
}
