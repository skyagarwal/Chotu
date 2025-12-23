import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class IntentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.intentDefinition.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const intent = await this.prisma.intentDefinition.findUnique({
      where: { id },
    });
    if (!intent) {
      throw new NotFoundException(`Intent with ID ${id} not found`);
    }
    return intent;
  }

  async create(data: Prisma.IntentDefinitionCreateInput) {
    // Sanitize input: remove 'parameters' if present as it's not in the schema
    const { parameters, ...validData } = data as any;
    return this.prisma.intentDefinition.create({
      data: validData,
    });
  }

  async update(id: string, data: Prisma.IntentDefinitionUpdateInput) {
    // Sanitize input: remove 'parameters' if present
    const { parameters, ...validData } = data as any;
    try {
      return await this.prisma.intentDefinition.update({
        where: { id },
        data: validData,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Intent with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.intentDefinition.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Intent with ID ${id} not found`);
      }
      throw error;
    }
  }
}
