import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

// Só pra `me`/`updateMe` — inclui campos privados (email, mfaEnabled) que
// só o próprio dono da conta deve ver.
const OWN_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  avatarUrl: true,
  bannerUrl: true,
  bio: true,
  customStatus: true,
  status: true,
  mfaEnabled: true,
  createdAt: true,
} as const;

// Card de perfil de QUALQUER usuário — nunca inclui email nem mfaEnabled.
const PROFILE_CARD_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bannerUrl: true,
  bio: true,
  customStatus: true,
  status: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: OWN_USER_SELECT,
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_CARD_SELECT,
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: OWN_USER_SELECT,
    });
  }
}
