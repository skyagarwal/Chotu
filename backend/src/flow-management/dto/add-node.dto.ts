import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class AddNodeDto {
  @IsString()
  @IsNotEmpty()
  type: string; // 'message', 'api', 'condition', 'action'

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsObject()
  @IsOptional()
  config?: any;

  @IsString()
  @IsOptional()
  previousNodeId?: string;
}
