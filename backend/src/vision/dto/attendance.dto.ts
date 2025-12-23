import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum AttendanceAction {
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
  VERIFY = 'verify',
}

export class MarkAttendanceDto {
  @IsOptional()
  imageBuffer?: Buffer;

  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsEnum(AttendanceAction)
  action?: AttendanceAction = AttendanceAction.CHECK_IN;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class RegisterEmployeeFaceDto {
  @IsString()
  employeeId: string;

  @IsString()
  name: string;

  @IsOptional()
  imageBuffer?: Buffer;

  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  designation?: string;
}

export class AttendanceResult {
  success: boolean;
  employeeId?: string;
  employeeName?: string;
  action: AttendanceAction;
  timestamp: Date;
  confidence: number;
  facesDetected: number;
  matchedFace?: {
    employeeId: string;
    name: string;
    confidence: number;
    lastSeen?: Date;
  };
  message: string;
}
