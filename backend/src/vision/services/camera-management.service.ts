import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

interface Camera {
  id: string;
  name: string;
  location: string;
  streamUrl: string;
  type: 'rtsp' | 'http' | 'usb';
  enabled: boolean;
  zoneId?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class CameraManagementService {
  private readonly logger = new Logger(CameraManagementService.name);
  private cameras: Map<string, Camera> = new Map();

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.initializeDefaultCameras();
  }

  /**
   * Initialize with default cameras from config
   */
  private initializeDefaultCameras(): void {
    // TODO: Load from database or config
    const defaultCameras: Camera[] = [
      {
        id: 'cam-001',
        name: 'Main Entrance',
        location: 'Building A - Entrance',
        streamUrl: 'rtsp://localhost:8554/entrance',
        type: 'rtsp',
        enabled: true,
        zoneId: 1,
      },
      {
        id: 'cam-002',
        name: 'Warehouse Floor',
        location: 'Warehouse - Zone 1',
        streamUrl: 'rtsp://localhost:8554/warehouse',
        type: 'rtsp',
        enabled: true,
        zoneId: 2,
      },
    ];

    defaultCameras.forEach(camera => {
      this.cameras.set(camera.id, camera);
    });

    this.logger.log(`Initialized ${this.cameras.size} cameras`);
  }

  /**
   * Get all cameras
   */
  async getCameras(): Promise<Camera[]> {
    return Array.from(this.cameras.values());
  }

  /**
   * Get camera by ID
   */
  async getCamera(id: string): Promise<Camera | null> {
    return this.cameras.get(id) || null;
  }

  /**
   * Register a new camera
   */
  async registerCamera(camera: Partial<Camera>): Promise<Camera> {
    const id = camera.id || `cam-${Date.now()}`;
    
    const newCamera: Camera = {
      id,
      name: camera.name || 'Unnamed Camera',
      location: camera.location || 'Unknown',
      streamUrl: camera.streamUrl || '',
      type: camera.type || 'rtsp',
      enabled: camera.enabled !== undefined ? camera.enabled : true,
      zoneId: camera.zoneId,
      metadata: camera.metadata || {},
    };

    this.cameras.set(id, newCamera);
    this.logger.log(`Registered camera: ${newCamera.name} (${id})`);

    return newCamera;
  }

  /**
   * Update camera
   */
  async updateCamera(id: string, updates: Partial<Camera>): Promise<Camera | null> {
    const camera = this.cameras.get(id);
    if (!camera) {
      return null;
    }

    const updated = { ...camera, ...updates, id }; // Preserve ID
    this.cameras.set(id, updated);

    return updated;
  }

  /**
   * Delete camera
   */
  async deleteCamera(id: string): Promise<boolean> {
    return this.cameras.delete(id);
  }

  /**
   * Get camera stream URL
   */
  async getCameraStream(id: string): Promise<{ streamUrl: string } | null> {
    const camera = this.cameras.get(id);
    if (!camera || !camera.enabled) {
      return null;
    }

    return { streamUrl: camera.streamUrl };
  }

  /**
   * Get cameras by zone
   */
  async getCamerasByZone(zoneId: number): Promise<Camera[]> {
    return Array.from(this.cameras.values()).filter(
      camera => camera.zoneId === zoneId && camera.enabled
    );
  }

  /**
   * Get camera stats
   */
  async getCameraStats(): Promise<any> {
    const total = this.cameras.size;
    const active = Array.from(this.cameras.values()).filter(c => c.enabled).length;
    return {
      total,
      active,
      inactive: total - active,
      maintenance: 0,
    };
  }

  /**
   * Get live stream stats
   */
  async getLiveStreamStats(): Promise<any> {
    return {
      activeStreams: Array.from(this.cameras.values()).filter(c => c.enabled).length,
      totalBandwidth: '12.5 Mbps', // Mock
      avgLatency: '120ms', // Mock
      viewers: 5, // Mock
    };
  }
}
