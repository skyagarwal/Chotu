import { Controller, Post, Get, Body, Logger, UploadedFile, UseInterceptors, Query, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VisionService } from '../services/vision.service';
import { FaceRecognitionService } from '../services/face-recognition.service';
import { PpeDetectionService } from '../services/ppe-detection.service';
import { CameraManagementService } from '../services/camera-management.service';
import { FoodQualityService } from '../services/food-quality.service';
import { ProductSearchService } from '../services/product-search.service';
import { CountingService } from '../services/counting.service';
import { AttendanceService } from '../services/attendance.service';
import { UniformDetectionService } from '../services/uniform-detection.service';
import { PacketCountingService } from '../services/packet-counting.service';
import { PickupDropVerificationService } from '../services/pickup-drop-verification.service';
import { AnalyzeImageDto } from '../dto/analyze-image.dto';
import { ImageAnalysisResultDto } from '../dto/image-analysis-result.dto';
import { CountingTarget } from '../dto/counting.dto';
import { AttendanceAction } from '../dto/attendance.dto';
import { PickupDropType } from '../dto/pickup-drop.dto';
import { UniformType } from '../dto/uniform-detection.dto';

@Controller('vision')
export class VisionController {
  private readonly logger = new Logger(VisionController.name);

  constructor(
    private readonly visionService: VisionService,
    private readonly faceRecognitionService: FaceRecognitionService,
    private readonly ppeDetectionService: PpeDetectionService,
    private readonly cameraManagementService: CameraManagementService,
    private readonly foodQualityService: FoodQualityService,
    private readonly productSearchService: ProductSearchService,
    private readonly countingService: CountingService,
    private readonly attendanceService: AttendanceService,
    private readonly uniformDetectionService: UniformDetectionService,
    private readonly packetCountingService: PacketCountingService,
    private readonly pickupDropService: PickupDropVerificationService,
  ) {}

  @Post('analyze')
  @UseInterceptors(FileInterceptor('image'))
  async analyzeImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AnalyzeImageDto,
  ): Promise<ImageAnalysisResultDto> {
    this.logger.log(`Analyze image request (features: ${dto.features?.join(', ') || 'default'})`);
    
    // Use uploaded file buffer or URL from dto
    const imageBuffer = file ? file.buffer : undefined;
    const imageUrl = dto.imageUrl;

    if (!imageBuffer && !imageUrl) {
      throw new Error('Either image file or imageUrl is required');
    }

    return this.visionService.analyzeImage({
      ...dto,
      imageBuffer,
    });
  }

  @Post('analyze/url')
  async analyzeImageUrl(@Body() dto: AnalyzeImageDto): Promise<ImageAnalysisResultDto> {
    this.logger.log(`Analyze image URL: ${dto.imageUrl}`);
    
    if (!dto.imageUrl) {
      throw new Error('imageUrl is required');
    }

    return this.visionService.analyzeImage(dto);
  }

  @Post('ppe/detect')
  @UseInterceptors(FileInterceptor('image'))
  async detectPpe(
    @UploadedFile() file: Express.Multer.File,
    @Body('imageUrl') imageUrl?: string,
  ): Promise<any> {
    this.logger.log('PPE detection request');
    
    const imageBuffer = file ? file.buffer : undefined;

    if (!imageBuffer && !imageUrl) {
      throw new Error('Either image file or imageUrl is required');
    }

    return this.ppeDetectionService.detectPpe(imageBuffer);
  }

  @Post('faces/detect')
  @UseInterceptors(FileInterceptor('image'))
  async detectFaces(
    @UploadedFile() file: Express.Multer.File,
    @Body('imageUrl') imageUrl?: string,
    @Body('recognize') recognize?: boolean,
  ): Promise<any> {
    this.logger.log(`Face detection request (recognize: ${recognize || false})`);
    
    const imageBuffer = file ? file.buffer : undefined;

    if (!imageBuffer && !imageUrl) {
      throw new Error('Either image file or imageUrl is required');
    }

    return this.faceRecognitionService.detectFaces(imageBuffer, imageUrl, recognize || false);
  }

  @Post('faces/register')
  @UseInterceptors(FileInterceptor('image'))
  async registerFace(
    @UploadedFile() file: Express.Multer.File,
    @Body('personId') personId: string,
    @Body('personName') personName: string,
    @Body('imageUrl') imageUrl?: string,
  ): Promise<any> {
    this.logger.log(`Register face for person: ${personName} (${personId})`);
    
    const imageBuffer = file ? file.buffer : undefined;

    if (!imageBuffer && !imageUrl) {
      throw new Error('Either image file or imageUrl is required');
    }

    if (!personId || !personName) {
      throw new Error('personId and personName are required');
    }

    return this.faceRecognitionService.registerFace(personId, personName, imageBuffer, imageUrl);
  }

  @Get('cameras')
  async getCameras(): Promise<any> {
    return this.cameraManagementService.getCameras();
  }

  @Get('cameras/stats')
  async getCameraStats(): Promise<any> {
    return this.cameraManagementService.getCameraStats();
  }

  @Get('live-stream/stats')
  async getLiveStreamStats(): Promise<any> {
    return this.cameraManagementService.getLiveStreamStats();
  }

  @Post('cameras/register')
  async registerCamera(@Body() camera: any): Promise<any> {
    this.logger.log(`Register camera: ${camera.name}`);
    return this.cameraManagementService.registerCamera(camera);
  }

  @Get('cameras/:id/stream')
  async getCameraStream(@Query('id') id: string): Promise<any> {
    return this.cameraManagementService.getCameraStream(id);
  }

  // ========== MANGWALE EYES - Food Quality ==========
  @Post('food/analyze')
  @UseInterceptors(FileInterceptor('image'))
  async analyzeFoodQuality(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    this.logger.log('🍕 Food quality analysis request');
    
    if (!file) {
      throw new Error('Image file is required');
    }

    return this.foodQualityService.analyzeFoodQuality(file.buffer);
  }

  // ========== MANGWALE EYES - Product Search ==========
  @Post('product/search')
  @UseInterceptors(FileInterceptor('image'))
  async searchProduct(
    @UploadedFile() file: Express.Multer.File,
    @Body('maxResults') maxResults?: number,
  ): Promise<any> {
    this.logger.log('🛒 Product search by image request');
    
    if (!file) {
      throw new Error('Image file is required');
    }

    return this.productSearchService.searchProductByImage(
      file.buffer,
      maxResults || 10,
    );
  }

  // ========== MANGWALE EYES - Counting ==========
  @Post('count')
  @UseInterceptors(FileInterceptor('image'))
  async countObjects(
    @UploadedFile() file: Express.Multer.File,
    @Body('target') target?: CountingTarget,
    @Body('specificClasses') specificClasses?: string[],
    @Body('confidenceThreshold') confidenceThreshold?: number,
  ): Promise<any> {
    this.logger.log(`🔢 Counting request (target: ${target || 'all'})`);
    
    if (!file) {
      throw new Error('Image file is required');
    }

    return this.countingService.countObjects(
      file.buffer,
      target || CountingTarget.ALL,
      specificClasses,
      confidenceThreshold || 0.5,
    );
  }

  @Post('count/people')
  @UseInterceptors(FileInterceptor('image'))
  async countPeople(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ count: number }> {
    this.logger.log('👥 Count people request');
    
    if (!file) {
      throw new Error('Image file is required');
    }

    const count = await this.countingService.countPeople(file.buffer);
    return { count };
  }

  // ========== MANGWALE EYES - Attendance ==========
  @Post('attendance/register')
  @UseInterceptors(FileInterceptor('image'))
  async registerEmployeeFace(
    @UploadedFile() file: Express.Multer.File,
    @Body('employeeId') employeeId: string,
    @Body('name') name: string,
    @Body('department') department?: string,
    @Body('designation') designation?: string,
  ): Promise<any> {
    this.logger.log(`👤 Register employee face: ${name} (${employeeId})`);
    
    if (!file) {
      throw new Error('Image file is required');
    }

    if (!employeeId || !name) {
      throw new Error('employeeId and name are required');
    }

    return this.attendanceService.registerEmployeeFace({
      employeeId,
      name,
      imageBuffer: file.buffer,
      department,
      designation,
    });
  }

  @Post('attendance/mark')
  @UseInterceptors(FileInterceptor('image'))
  async markAttendance(
    @UploadedFile() file: Express.Multer.File,
    @Body('action') action?: AttendanceAction,
    @Body('employeeId') employeeId?: string,
    @Body('location') location?: string,
    @Body('deviceId') deviceId?: string,
  ): Promise<any> {
    this.logger.log(`📸 Mark attendance request (action: ${action || 'check_in'})`);
    
    if (!file) {
      throw new Error('Image file is required');
    }

    return this.attendanceService.markAttendance(
      file.buffer,
      action || AttendanceAction.CHECK_IN,
      employeeId,
      location,
      deviceId,
    );
  }

  @Get('employees')
  async getEmployees(): Promise<any[]> {
    return this.attendanceService.getAllEmployees();
  }

  @Get('employees/stats')
  async getEmployeeStats(): Promise<any> {
    return this.attendanceService.getEmployeeStats();
  }

  @Get('attendance/summary')
  async getAttendanceSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.attendanceService.getAttendanceSummary(start, end);
  }

  @Get('attendance/logs')
  async getAllAttendanceLogs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId') employeeId?: string,
  ): Promise<any[]> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.attendanceService.getAttendanceLogs(employeeId, start, end);
  }

  @Get('attendance/:employeeId')
  async getAttendanceLogs(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any[]> {
    this.logger.log(`📊 Get attendance logs for employee: ${employeeId}`);
    
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.attendanceService.getAttendanceLogs(employeeId, start, end);
  }

  @Get('health')
  async health(): Promise<{ status: string; services: any }> {
    return {
      status: 'ok',
      services: {
        imageAnalysis: true,
        faceRecognition: true,
        ppeDetection: true,
        cameraManagement: true,
        foodQuality: true,
        productSearch: true,
        counting: true,
        attendance: true,
        uniformDetection: true,
        packetCounting: true,
        pickupDropVerification: true,
        modelTraining: true,
      },
    };
  }

  /**
   * Verify rider uniform compliance
   * POST /vision/uniform/detect
   */
  @Post('uniform/detect')
  @UseInterceptors(FileInterceptor('image'))
  async detectUniform(
    @UploadedFile() file: Express.Multer.File,
    @Body('uniformType') uniformType?: UniformType,
  ): Promise<any> {
    this.logger.log(`🧥 Uniform detection request (type: ${uniformType || UniformType.DELIVERY_RIDER})`);
    
    if (!file) {
      throw new Error('Image file is required');
    }

    return this.uniformDetectionService.detectUniform({
      imageBuffer: file.buffer,
      uniformType: uniformType || UniformType.DELIVERY_RIDER,
    });
  }

  /**
   * Count packets with size classification
   * POST /vision/packets/count
   */
  @Post('packets/count')
  @UseInterceptors(FileInterceptor('image'))
  async countPackets(
    @UploadedFile() file: Express.Multer.File,
    @Body('expectedCount') expectedCount?: number,
  ): Promise<any> {
    this.logger.log(`📦 Packet counting request (expected: ${expectedCount || 'any'})`);
    
    if (!file) {
      throw new Error('Image file is required');
    }

    return this.packetCountingService.countPackets({
      imageBuffer: file.buffer,
      expectedCount,
      detectSizes: true,
      detectTypes: true,
    });
  }

  /**
   * Verify pickup/drop with comprehensive checks
   * POST /vision/pickup-drop/verify
   */
  @Post('pickup-drop/verify')
  @UseInterceptors(FileInterceptor('image'))
  async verifyPickupDrop(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: PickupDropType,
    @Body('orderId') orderId?: string,
    @Body('riderId') riderId?: string,
    @Body('expectedPackages') expectedPackages?: number,
  ): Promise<any> {
    this.logger.log(`📋 Pickup/Drop verification (type: ${type}, order: ${orderId || 'N/A'})`);
    
    if (!file) {
      throw new Error('Image file is required');
    }

    return this.pickupDropService.verifyPickupDrop({
      imageBuffer: file.buffer,
      type,
      orderId,
      riderId,
      expectedPackages,
    });
  }
}
