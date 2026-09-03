import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ListMessagesDto, SearchMessagesDto } from './dto/list-messages.dto';

@Controller('channels/:channelId/messages')
export class ChannelMessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Post()
  create(
    @Param('channelId') channelId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messages.create(channelId, user.id, dto);
  }

  @Get()
  list(
    @Param('channelId') channelId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMessagesDto,
  ) {
    return this.messages.list(channelId, user.id, query);
  }

  @Get('search')
  search(
    @Param('channelId') channelId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchMessagesDto,
  ) {
    return this.messages.search(channelId, user.id, query.q);
  }
}

@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Patch(':messageId')
  update(
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messages.update(messageId, user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':messageId')
  async remove(@Param('messageId') messageId: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.messages.remove(messageId, user.id);
  }
}
