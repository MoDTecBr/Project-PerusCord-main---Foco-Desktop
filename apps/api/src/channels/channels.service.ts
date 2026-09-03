import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogAction, Prisma } from '@prisma/client';
import { RealtimeEvent } from '@relay/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async createCategory(serverId: string, actorId: string, dto: CreateCategoryDto) {
    const position = await this.prisma.category.count({ where: { serverId } });
    const category = await this.prisma.category.create({
      data: { serverId, name: dto.name, position },
    });
    await this.audit.record({
      serverId,
      actorId,
      action: AuditLogAction.CATEGORY_CREATE,
      targetId: category.id,
    });
    this.realtime.emitToServer(serverId, RealtimeEvent.CATEGORY_CREATE, category);
    return category;
  }

  async deleteCategory(categoryId: string, actorId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }
    await this.prisma.category.delete({ where: { id: categoryId } });
    await this.audit.record({
      serverId: category.serverId,
      actorId,
      action: AuditLogAction.CATEGORY_DELETE,
      targetId: categoryId,
    });
    this.realtime.emitToServer(category.serverId, RealtimeEvent.CATEGORY_DELETE, {
      id: categoryId,
      serverId: category.serverId,
    });
  }

  async createChannel(serverId: string, actorId: string, dto: CreateChannelDto) {
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category || category.serverId !== serverId) {
        throw new BadRequestException('Categoria não pertence a este servidor.');
      }
    }

    const position = await this.prisma.channel.count({
      where: { serverId, categoryId: dto.categoryId ?? null },
    });

    const channel = await this.prisma.channel.create({
      data: {
        serverId,
        categoryId: dto.categoryId,
        name: dto.name,
        type: dto.type,
        topic: dto.topic,
        position,
      },
    });

    await this.audit.record({
      serverId,
      actorId,
      action: AuditLogAction.CHANNEL_CREATE,
      targetId: channel.id,
      metadata: { type: dto.type },
    });

    this.realtime.emitToServer(serverId, RealtimeEvent.CHANNEL_CREATE, channel);
    return channel;
  }

  async updateChannel(channelId: string, actorId: string, dto: UpdateChannelDto) {
    const existing = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!existing || !existing.serverId) {
      throw new NotFoundException('Canal não encontrado.');
    }
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category || category.serverId !== existing.serverId) {
        throw new BadRequestException('Categoria não pertence a este servidor.');
      }
    }

    const channel = await this.prisma.channel.update({ where: { id: channelId }, data: dto });
    await this.audit.record({
      serverId: existing.serverId,
      actorId,
      action: AuditLogAction.CHANNEL_UPDATE,
      targetId: channelId,
      metadata: dto as unknown as Prisma.InputJsonValue,
    });
    this.realtime.emitToServer(existing.serverId, RealtimeEvent.CHANNEL_UPDATE, channel);
    return channel;
  }

  async deleteChannel(channelId: string, actorId: string): Promise<void> {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || !channel.serverId) {
      throw new NotFoundException('Canal não encontrado.');
    }
    await this.prisma.channel.delete({ where: { id: channelId } });
    await this.audit.record({
      serverId: channel.serverId,
      actorId,
      action: AuditLogAction.CHANNEL_DELETE,
      targetId: channelId,
    });
    this.realtime.emitToServer(channel.serverId, RealtimeEvent.CHANNEL_DELETE, {
      id: channelId,
      serverId: channel.serverId,
    });
  }
}
