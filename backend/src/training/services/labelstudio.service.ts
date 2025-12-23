import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class LabelStudioService {
  private readonly logger = new Logger(LabelStudioService.name);
  private readonly labelStudioUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.labelStudioUrl = this.config.get('LABEL_STUDIO_URL', 'http://localhost:8080');
    this.apiKey = this.config.get('LABEL_STUDIO_API_KEY', '');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.labelStudioUrl}/api/health`, {
          headers: this.getHeaders(),
        }),
      );
      return response.status === 200;
    } catch (error) {
      this.logger.warn('Label Studio health check failed');
      return false;
    }
  }

  async getProjects(): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.labelStudioUrl}/api/projects`, {
          headers: this.getHeaders(),
        }),
      );
      return response.data.results || [];
    } catch (error) {
      this.logger.error(`Failed to get Label Studio projects: ${error.message}`);
      return [];
    }
  }

  async createProject(projectData: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.labelStudioUrl}/api/projects`,
          projectData,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create Label Studio project: ${error.message}`);
      throw error;
    }
  }

  async exportData(projectId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.labelStudioUrl}/api/projects/${projectId}/export`,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to export Label Studio data: ${error.message}`);
      throw error;
    }
  }

  async syncData(projectId: string = '1'): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Starting Label Studio sync for project ${projectId}...`);
      
      // Execute the sync script
      const { stdout, stderr } = await execAsync(`npm run label-studio:sync -- --project-id ${projectId}`);
      
      this.logger.log(`Sync output: ${stdout}`);
      if (stderr) this.logger.warn(`Sync stderr: ${stderr}`);

      return {
        success: true,
        message: 'Sync completed successfully',
      };
    } catch (error) {
      this.logger.error(`Sync failed: ${error.message}`);
      return {
        success: false,
        message: `Sync failed: ${error.message}`,
      };
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Token ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }
}
