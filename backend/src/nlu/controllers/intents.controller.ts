import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { IntentsService } from '../services/intents.service';
import { Prisma } from '@prisma/client';

@Controller('intents')
export class IntentsController {
  constructor(private readonly intentsService: IntentsService) {}

  @Get()
  findAll() {
    return this.intentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.intentsService.findOne(id);
  }

  @Post()
  create(@Body() data: Prisma.IntentDefinitionCreateInput) {
    return this.intentsService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: Prisma.IntentDefinitionUpdateInput) {
    return this.intentsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.intentsService.remove(id);
  }
}
