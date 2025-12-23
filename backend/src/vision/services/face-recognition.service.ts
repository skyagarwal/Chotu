import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';

@Injectable()
export class FaceRecognitionService {
  private readonly logger = new Logger(FaceRecognitionService.name);
  private readonly faceApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.faceApiUrl = this.config.get('FACE_API_URL', 'http://localhost:8021');
  }

  /**
   * Detect faces in image
   */
  async detectFaces(
    imageBuffer?: Buffer,
    imageUrl?: string,
    recognize: boolean = false,
  ): Promise<{ faces: any[] }> {
    try {
      let response: any;

      if (imageBuffer) {
        const formData = new FormData();
        formData.append('image', imageBuffer, 'image.jpg');
        formData.append('recognize', recognize.toString());

        response = await firstValueFrom(
          this.httpService.post(`${this.faceApiUrl}/detect`, formData, {
            headers: formData.getHeaders(),
          }),
        );
      } else if (imageUrl) {
        response = await firstValueFrom(
          this.httpService.post(`${this.faceApiUrl}/detect`, {
            image_url: imageUrl,
            recognize,
          }),
        );
      } else {
        throw new Error('Either imageBuffer or imageUrl is required');
      }

      return { faces: response.data.faces || [] };
    } catch (error) {
      this.logger.error(`Face detection failed: ${error.message}`);
      return { faces: [] };
    }
  }

  /**
   * Register a new face for recognition
   */
  async registerFace(
    personId: string,
    personName: string,
    imageBuffer?: Buffer,
    imageUrl?: string,
  ): Promise<any> {
    try {
      let response: any;

      if (imageBuffer) {
        const formData = new FormData();
        formData.append('image', imageBuffer, 'image.jpg');
        formData.append('person_id', personId);
        formData.append('person_name', personName);

        response = await firstValueFrom(
          this.httpService.post(`${this.faceApiUrl}/register`, formData, {
            headers: formData.getHeaders(),
          }),
        );
      } else if (imageUrl) {
        response = await firstValueFrom(
          this.httpService.post(`${this.faceApiUrl}/register`, {
            image_url: imageUrl,
            person_id: personId,
            person_name: personName,
          }),
        );
      } else {
        throw new Error('Either imageBuffer or imageUrl is required');
      }

      return {
        success: true,
        personId,
        personName,
        faceId: response.data.face_id,
      };
    } catch (error) {
      this.logger.error(`Face registration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Recognize faces in image
   */
  async recognizeFaces(
    imageBuffer?: Buffer,
    imageUrl?: string,
  ): Promise<any[]> {
    const result = await this.detectFaces(imageBuffer, imageUrl, true);
    return result.faces.filter(face => face.recognized);
  }
}
