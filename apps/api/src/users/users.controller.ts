import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getById(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // Precisa vir DEPOIS de "me" — se viesse antes, "me" seria interpretado
  // como um :id (rotas estáticas precisam ser declaradas antes das dinâmicas
  // no mesmo prefixo pra não haver ambiguidade).
  @Get(':id')
  profile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }
}
