import { IsObject, IsOptional } from 'class-validator';

export class ExecuteFlowDto {
  @IsObject()
  @IsOptional()
  initialContext?: {
    phone?: string;
    userId?: number;
    [key: string]: any;
  };
}
