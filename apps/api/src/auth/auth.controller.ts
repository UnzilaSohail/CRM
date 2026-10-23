import { BadRequestException, Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { INTERNAL_ROLES, ROLES } from '@crm/types';
import { loginInput, mfaConfirmInput } from '@crm/validators';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { Public, Roles } from '../common/decorators/roles.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @HttpCode(200)
  @Post('login')
  login(@Body() body: unknown, @Req() req: { ip: string }) {
    const parsed = loginInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.auth.login(parsed.data, req.ip);
  }

  @Roles(...ROLES)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Roles(...INTERNAL_ROLES)
  @Post('mfa/enroll')
  enroll(@CurrentUser() user: AuthUser) {
    return this.auth.startMfaEnrollment(user.id, user.tenantId);
  }

  @Roles(...INTERNAL_ROLES)
  @HttpCode(200)
  @Post('mfa/confirm')
  confirm(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = mfaConfirmInput.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.auth.confirmMfaEnrollment(user.id, user.tenantId, parsed.data);
  }
}
