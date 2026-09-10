import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStickerDto } from './dto/create-sticker.dto';

const MAX_STICKERS_PER_USER = 100;

@Injectable()
export class StickersService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    return this.prisma.sticker.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateStickerDto) {
    const count = await this.prisma.sticker.count({ where: { ownerId: userId } });
    if (count >= MAX_STICKERS_PER_USER) {
      throw new BadRequestException(`Limite de ${MAX_STICKERS_PER_USER} figurinhas atingido.`);
    }
    return this.prisma.sticker.create({
      data: {
        ownerId: userId,
        url: dto.url,
        mimeType: dto.mimeType,
        size: dto.size,
        name: dto.name,
      },
    });
  }

  async remove(userId: string, stickerId: string): Promise<void> {
    const sticker = await this.prisma.sticker.findUnique({ where: { id: stickerId } });
    if (!sticker || sticker.ownerId !== userId) {
      throw new NotFoundException('Figurinha não encontrada.');
    }
    await this.prisma.sticker.delete({ where: { id: stickerId } });
  }
}
