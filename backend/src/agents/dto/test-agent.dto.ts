import { IsString, IsNotEmpty } from 'class-validator';

export class TestAgentDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
