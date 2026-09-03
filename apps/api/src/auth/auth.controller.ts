import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { MfaConfirmDto, MfaDisableDto } from './dto/mfa.dto';

function requestContext(req: Request) {
  return { userAgent: req.headers['user-agent'], ipAddress: req.ip };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, requestContext(req));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, requestContext(req));
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, requestContext(req));
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Post('mfa/enroll')
  startMfaEnrollment(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.startMfaEnrollment(user.id);
  }

  @Post('mfa/confirm')
  confirmMfaEnrollment(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaConfirmDto) {
    return this.authService.confirmMfaEnrollment(user.id, dto.code);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('mfa/disable')
  async disableMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaDisableDto): Promise<void> {
    await this.authService.disableMfa(user.id, dto.code);
  }
}
