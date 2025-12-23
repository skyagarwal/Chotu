import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';

@Injectable()
export class ModelsService {
  constructor(private prisma: PrismaService) {}

  async create(createModelDto: CreateModelDto) {
    const model = await this.prisma.model.create({
      data: {
        name: createModelDto.name,
        provider: createModelDto.provider,
        providerModelId: createModelDto.providerModelId,
        modelType: createModelDto.modelType,
        endpoint: createModelDto.endpoint,
        apiKey: createModelDto.apiKey, // TODO: Encrypt in production
        deploymentName: createModelDto.deploymentName,
        config: createModelDto.config || {},
        capabilities: createModelDto.capabilities || [],
        maxTokens: createModelDto.maxTokens,
        costPerToken: createModelDto.costPerToken,
        isLocal: createModelDto.isLocal || false,
        metadata: createModelDto.metadata || {},
        status: 'active',
      },
    });

    return this.sanitizeModel(model);
  }

  async findAll(filters?: { provider?: string; modelType?: string; status?: string }) {
    const where: any = {};
    
    if (filters?.provider) {
      where.provider = filters.provider;
    }
    if (filters?.modelType) {
      where.modelType = filters.modelType;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const models = await this.prisma.model.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Perform health checks for local models
    const modelsWithHealth = await Promise.all(models.map(async (model) => {
      const sanitized = this.sanitizeModel(model);
      
      // Only check health for local models with endpoints
      if (model.isLocal && model.endpoint && model.status === 'active') {
        try {
          const isHealthy = await this.checkModelHealth(model.endpoint, model.modelType);
          return {
            ...sanitized,
            healthStatus: isHealthy ? 'healthy' : 'unhealthy',
          };
        } catch (e) {
          return {
            ...sanitized,
            healthStatus: 'unhealthy',
          };
        }
      }
      
      return {
        ...sanitized,
        healthStatus: 'unknown', // Cloud models assumed managed
      };
    }));

    return modelsWithHealth;
  }

  private async checkModelHealth(endpoint: string, type: string): Promise<boolean> {
    try {
      // Simple fetch to health endpoint
      // Adjust path based on service type
      let healthPath = '/health';
      if (type === 'llm') healthPath = '/v1/models'; // vLLM standard
      
      // Remove trailing slash if present
      const baseUrl = endpoint.replace(/\/$/, '');
      
      // For vLLM, we might need to check root or specific path
      // This is a basic implementation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

      const response = await fetch(`${baseUrl}${healthPath}`, { 
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async findOne(id: string) {
    const model = await this.prisma.model.findUnique({
      where: { id },
    });

    if (!model) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }

    return this.sanitizeModel(model);
  }

  async update(id: string, updateModelDto: UpdateModelDto) {
    const existingModel = await this.prisma.model.findUnique({
      where: { id },
    });

    if (!existingModel) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }

    const updatedModel = await this.prisma.model.update({
      where: { id },
      data: {
        ...updateModelDto,
        updatedAt: new Date(),
      },
    });

    return this.sanitizeModel(updatedModel);
  }

  async remove(id: string) {
    const existingModel = await this.prisma.model.findUnique({
      where: { id },
    });

    if (!existingModel) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }

    await this.prisma.model.delete({
      where: { id },
    });

    return { message: 'Model deleted successfully', id };
  }

  async toggleStatus(id: string) {
    const model = await this.prisma.model.findUnique({
      where: { id },
    });

    if (!model) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }

    const newStatus = model.status === 'active' ? 'inactive' : 'active';

    const updatedModel = await this.prisma.model.update({
      where: { id },
      data: { status: newStatus },
    });

    return this.sanitizeModel(updatedModel);
  }

  // Helper method to remove sensitive data
  private sanitizeModel(model: any) {
    const { apiKey, ...sanitized } = model;
    return {
      ...sanitized,
      hasApiKey: !!apiKey, // Just indicate if API key exists
    };
  }
}
