import { IsString, IsObject, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFlowDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['food', 'parcel', 'ecommerce', 'general'])
  module: 'food' | 'parcel' | 'ecommerce' | 'general';

  @IsOptional()
  @IsString()
  trigger?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsObject()
  states: Record<string, any>;

  @IsString()
  initialState: string;

  @IsArray()
  @IsString({ each: true })
  finalStates: string[];

  @IsOptional()
  @IsObject()
  contextSchema?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateFlowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['food', 'parcel', 'ecommerce', 'general'])
  module?: 'food' | 'parcel' | 'ecommerce' | 'general';

  @IsOptional()
  @IsString()
  trigger?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsObject()
  states?: Record<string, any>;

  @IsOptional()
  @IsString()
  initialState?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  finalStates?: string[];

  @IsOptional()
  @IsObject()
  contextSchema?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AddStateDto {
  @IsString()
  stateName: string;

  @IsEnum(['action', 'decision', 'end'])
  type: 'action' | 'decision' | 'end';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  actions?: any[];

  @IsOptional()
  @IsArray()
  conditions?: any[];

  @IsObject()
  transitions: Record<string, string>;

  @IsOptional()
  @IsArray()
  onEntry?: any[];

  @IsOptional()
  @IsArray()
  onExit?: any[];
}

export class ExecuteFlowDto {
  @IsString()
  sessionId: string;

  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsObject()
  initialContext?: Record<string, any>;
}
