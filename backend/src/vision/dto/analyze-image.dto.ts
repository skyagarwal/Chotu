import { IsString, IsNotEmpty, IsOptional, IsUrl, IsEnum, IsArray, IsBoolean } from 'class-validator';

export class AnalyzeImageDto {
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  imageBuffer?: Buffer;

  @IsOptional()
  @IsArray()
  @IsEnum(['objects', 'text', 'labels', 'faces', 'ppe', 'quality'], { each: true })
  features?: string[] = ['objects', 'labels'];

  @IsOptional()
  @IsBoolean()
  detectPpe?: boolean = false;

  @IsOptional()
  @IsBoolean()
  detectFaces?: boolean = false;

  @IsOptional()
  @IsString()
  model?: string = 'yolov8'; // yolov8, efficientdet, or custom
}
