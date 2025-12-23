import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';

@Injectable()
export class ImageAnalysisService {
  private readonly logger = new Logger(ImageAnalysisService.name);
  private readonly visionApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.visionApiUrl = this.config.get('VISION_API_URL', 'http://localhost:8020');
  }

  /**
   * Detect objects in image using YOLOv8 or other models
   */
  async detectObjects(
    imageBuffer?: Buffer,
    imageUrl?: string,
    model: string = 'yolov8',
  ): Promise<{ objects: any[]; labels: any[] }> {
    try {
      let response: any;

      if (imageBuffer) {
        // Send image as multipart/form-data
        const formData = new FormData();
        formData.append('image', imageBuffer, 'image.jpg');
        formData.append('model', model);

        response = await firstValueFrom(
          this.httpService.post(`${this.visionApiUrl}/detect`, formData, {
            headers: formData.getHeaders(),
          }),
        );
      } else if (imageUrl) {
        // Send image URL
        response = await firstValueFrom(
          this.httpService.post(`${this.visionApiUrl}/detect`, {
            image_url: imageUrl,
            model,
          }),
        );
      } else {
        throw new Error('Either imageBuffer or imageUrl is required');
      }

      const data = response.data;

      // Parse objects and extract unique labels
      const objects = data.objects || data.detections || [];
      const labels = this.extractLabels(objects);

      return { objects, labels };
    } catch (error) {
      this.logger.error(`Object detection failed: ${error.message}`);
      
      // Fallback to empty results
      return { objects: [], labels: [] };
    }
  }

  /**
   * Extract text from image (OCR)
   */
  async extractText(
    imageBuffer?: Buffer,
    imageUrl?: string,
  ): Promise<any[]> {
    try {
      let response: any;

      if (imageBuffer) {
        const formData = new FormData();
        formData.append('image', imageBuffer, 'image.jpg');

        response = await firstValueFrom(
          this.httpService.post(`${this.visionApiUrl}/ocr`, formData, {
            headers: formData.getHeaders(),
          }),
        );
      } else if (imageUrl) {
        response = await firstValueFrom(
          this.httpService.post(`${this.visionApiUrl}/ocr`, {
            image_url: imageUrl,
          }),
        );
      } else {
        throw new Error('Either imageBuffer or imageUrl is required');
      }

      return response.data.text || [];
    } catch (error) {
      this.logger.error(`Text extraction failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Assess image quality (brightness, contrast, sharpness)
   */
  async assessQuality(
    imageBuffer?: Buffer,
    imageUrl?: string,
  ): Promise<any> {
    try {
      let response: any;

      if (imageBuffer) {
        const formData = new FormData();
        formData.append('image', imageBuffer, 'image.jpg');

        response = await firstValueFrom(
          this.httpService.post(`${this.visionApiUrl}/quality`, formData, {
            headers: formData.getHeaders(),
          }),
        );
      } else if (imageUrl) {
        response = await firstValueFrom(
          this.httpService.post(`${this.visionApiUrl}/quality`, {
            image_url: imageUrl,
          }),
        );
      } else {
        throw new Error('Either imageBuffer or imageUrl is required');
      }

      return response.data.quality || {
        brightness: 0,
        contrast: 0,
        sharpness: 0,
        overall: 0,
      };
    } catch (error) {
      this.logger.error(`Quality assessment failed: ${error.message}`);
      return {
        brightness: 0,
        contrast: 0,
        sharpness: 0,
        overall: 0,
      };
    }
  }

  /**
   * Extract unique labels from detected objects
   */
  private extractLabels(objects: any[]): any[] {
    const labelMap = new Map<string, number>();

    for (const obj of objects) {
      const label = obj.class || obj.label;
      const confidence = obj.confidence || 0;

      if (!labelMap.has(label) || labelMap.get(label)! < confidence) {
        labelMap.set(label, confidence);
      }
    }

    return Array.from(labelMap.entries())
      .map(([label, confidence]) => ({ label, confidence }))
      .sort((a, b) => b.confidence - a.confidence);
  }
}
