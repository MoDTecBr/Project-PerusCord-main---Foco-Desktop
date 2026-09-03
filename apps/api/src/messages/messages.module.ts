import { Module } from '@nestjs/common';
import { ChannelMessagesController, MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  controllers: [ChannelMessagesController, MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
