import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateStickerDto } from './dto/create-sticker.dto';
import { StickersService } from './stickers.service';

@Controller('stickers')
export class StickersController {
  constructor(private readonly stickers: StickersService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.stickers.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStickerDto) {
    return this.stickers.create(user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.stickers.remove(user.id, id);
  }
}
