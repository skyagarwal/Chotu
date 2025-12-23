import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnnxRuntimeService } from './onnx-runtime.service';
import { AttendanceAction, AttendanceResult, RegisterEmployeeFaceDto } from '../dto/attendance.dto';
import sharp from 'sharp';

/**
 * Attendance Service using Face Recognition
 * Handles employee check-in/check-out via face detection
 * NOTE: Simplified version without database - uses in-memory storage
 */
@Injectable()
export class AttendanceService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceService.name);
  private readonly faceModelName = 'detection_10g.onnx';
  
  // In-memory storage (replace with database in production)
  private employees: Map<string, { id: string; name: string; embedding: any }> = new Map();
  private attendanceLogs: Array<any> = [];

  constructor(
    private readonly onnxRuntime: OnnxRuntimeService,
  ) {}

  async onModuleInit() {
    try {
      await this.onnxRuntime.loadModel(this.faceModelName);
      this.logger.log('✅ Face detection model loaded for attendance');
    } catch (error) {
      this.logger.warn(`⚠️ Face model not loaded: ${error.message}`);
    }
  }

  /**
   * Get all registered employees
   */
  async getAllEmployees(): Promise<any[]> {
    return Array.from(this.employees.values()).map(emp => ({
      id: emp.id,
      name: emp.name,
      registeredAt: new Date(), // Mock date
      status: 'active',
    }));
  }

  /**
   * Get employee stats
   */
  async getEmployeeStats(): Promise<any> {
    const total = this.employees.size;
    const active = total; // All active for now
    const presentToday = new Set(
      this.attendanceLogs
        .filter(log => {
          const today = new Date();
          return log.timestamp.getDate() === today.getDate() &&
                 log.timestamp.getMonth() === today.getMonth() &&
                 log.timestamp.getFullYear() === today.getFullYear();
        })
        .map(log => log.employeeId)
    ).size;

    return {
      total,
      active,
      presentToday,
      absentToday: total - presentToday,
    };
  }

  /**
   * Get attendance summary
   */
  async getAttendanceSummary(startDate?: Date, endDate?: Date): Promise<any> {
    // Mock summary
    return {
      totalCheckIns: this.attendanceLogs.filter(l => l.action === AttendanceAction.CHECK_IN).length,
      totalCheckOuts: this.attendanceLogs.filter(l => l.action === AttendanceAction.CHECK_OUT).length,
      averageHours: 8.5,
      onTimeRate: 95,
    };
  }

  /**
   * Register employee face
   */
  async registerEmployeeFace(dto: RegisterEmployeeFaceDto): Promise<any> {
    try {
      if (!dto.imageBuffer) {
        throw new Error('Image buffer is required');
      }

      // Detect faces in image
      const detection = await this.detectFaces(dto.imageBuffer);

      if (detection.facesDetected === 0) {
        throw new Error('No face detected in image');
      }

      if (detection.facesDetected > 1) {
        throw new Error('Multiple faces detected. Please provide image with single face');
      }

      // Generate face embedding
      const embedding = await this.generateFaceEmbedding(dto.imageBuffer);

      // Store in memory (replace with database)
      this.employees.set(dto.employeeId, {
        id: dto.employeeId,
        name: dto.name,
        embedding,
      });

      this.logger.log(`✅ Registered face for employee: ${dto.name} (${dto.employeeId})`);

      return {
        success: true,
        employeeId: dto.employeeId,
        name: dto.name,
        message: 'Face registered successfully',
      };
    } catch (error) {
      this.logger.error(`Face registration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark attendance using face recognition
   */
  async markAttendance(
    imageBuffer: Buffer,
    action: AttendanceAction,
    employeeId?: string,
    location?: string,
    deviceId?: string,
  ): Promise<AttendanceResult> {
    try {
      // Detect faces
      const detection = await this.detectFaces(imageBuffer);

      if (detection.facesDetected === 0) {
        return {
          success: false,
          action,
          timestamp: new Date(),
          confidence: 0,
          facesDetected: 0,
          message: 'No face detected in image',
        };
      }

      // If employeeId provided, verify it's the same person
      // Otherwise, find matching employee
      let matchedEmployee: { id: string; name: string; confidence: number } | null = null;

      if (employeeId) {
        // Verify employee exists
        const employee = this.employees.get(employeeId);

        if (!employee) {
          return {
            success: false,
            action,
            timestamp: new Date(),
            confidence: 0,
            facesDetected: detection.facesDetected,
            message: 'Employee not found',
          };
        }

        matchedEmployee = {
          id: employee.id,
          name: employee.name,
          confidence: 0.85, // Mock confidence
        };
      } else {
        // Find matching employee by face
        const embedding = await this.generateFaceEmbedding(imageBuffer);
        matchedEmployee = await this.findMatchingEmployee(embedding);

        if (!matchedEmployee) {
          return {
            success: false,
            action,
            timestamp: new Date(),
            confidence: 0,
            facesDetected: detection.facesDetected,
            message: 'Face not recognized. Please register first.',
          };
        }
      }

      // Log attendance
      const timestamp = new Date();
      this.attendanceLogs.push({
        employeeId: matchedEmployee.id,
        timestamp,
        action,
        location,
        deviceId,
        confidence: matchedEmployee.confidence,
      });

      this.logger.log(
        `✅ Attendance marked: ${matchedEmployee.name} - ${action} at ${timestamp.toISOString()}`,
      );

      return {
        success: true,
        employeeId: matchedEmployee.id,
        employeeName: matchedEmployee.name,
        action,
        timestamp,
        confidence: matchedEmployee.confidence,
        facesDetected: detection.facesDetected,
        matchedFace: {
          employeeId: matchedEmployee.id,
          name: matchedEmployee.name,
          confidence: matchedEmployee.confidence,
        },
        message: `Attendance marked successfully for ${matchedEmployee.name}`,
      };
    } catch (error) {
      this.logger.error(`Attendance marking failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect faces in image
   */
  private async detectFaces(imageBuffer: Buffer): Promise<any> {
    try {
      const image = sharp(imageBuffer);
      const { width, height } = await image.metadata();

      // For now, assume at least one face detected
      // TODO: Implement proper face detection post-processing
      return {
        facesDetected: 1,
        faces: [],
      };
    } catch (error) {
      this.logger.error(`Face detection failed: ${error.message}`);
      return { facesDetected: 0, faces: [] };
    }
  }

  /**
   * Generate face embedding (simplified)
   */
  private async generateFaceEmbedding(imageBuffer: Buffer): Promise<any> {
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();

    // Simple embedding based on image statistics
    const embedding = {
      width,
      height,
      timestamp: Date.now(),
    };

    return embedding;
  }

  /**
   * Find matching employee by face embedding
   */
  private async findMatchingEmployee(
    embedding: any,
  ): Promise<{ id: string; name: string; confidence: number } | null> {
    try {
      // Get all employees with embeddings
      const employeesList = Array.from(this.employees.values());

      if (employeesList.length === 0) {
        return null;
      }

      // TODO: Implement proper face embedding comparison
      // For now, return first employee with high confidence (mock)
      const mockMatch = employeesList[0];

      return {
        id: mockMatch.id,
        name: mockMatch.name,
        confidence: 0.85,
      };
    } catch (error) {
      this.logger.error(`Employee matching failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get attendance logs for employee
   */
  async getAttendanceLogs(
    employeeId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    try {
      let logs = this.attendanceLogs;
      
      if (employeeId) {
        logs = logs.filter((log) => log.employeeId === employeeId);
      }

      if (startDate) {
        logs = logs.filter((log) => log.timestamp >= startDate);
      }

      if (endDate) {
        logs = logs.filter((log) => log.timestamp <= endDate);
      }

      return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      this.logger.error(`Failed to fetch attendance logs: ${error.message}`);
      return [];
    }
  }
}
