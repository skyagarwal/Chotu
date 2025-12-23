import { IsString, IsOptional, IsObject } from 'class-validator';

export class DeployModelDto {
  @IsString()
  @IsOptional()
  endpoint?: string; // Deployment endpoint URL

  @IsObject()
  @IsOptional()
  config?: {
    replicas?: number;
    gpu?: boolean;
    memoryLimit?: string;
    [key: string]: any;
  };
}
