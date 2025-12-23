import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as ort from 'onnxruntime-node';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';

/**
 * ONNX Runtime Service
 * Provides inference capabilities for ONNX models on CPU/GPU
 */
@Injectable()
export class OnnxRuntimeService implements OnModuleInit {
  private readonly logger = new Logger(OnnxRuntimeService.name);
  private sessions: Map<string, ort.InferenceSession> = new Map();
  private readonly modelsPath: string;

  constructor() {
    // Use absolute path to models in src directory (works in both dev and prod)
    this.modelsPath = path.join(process.cwd(), 'src', 'vision', 'models');
  }

  async onModuleInit() {
    this.logger.log('🚀 Initializing ONNX Runtime Service');
    this.logger.log(`📂 Models path: ${this.modelsPath}`);

    // List available models
    await this.listModels();
  }

  /**
   * List available ONNX models
   */
  private async listModels(): Promise<void> {
    try {
      if (!fs.existsSync(this.modelsPath)) {
        this.logger.warn(`⚠️ Models directory does not exist: ${this.modelsPath}`);
        return;
      }

      const files = fs.readdirSync(this.modelsPath);
      const onnxFiles = files.filter((f) => f.endsWith('.onnx'));

      this.logger.log(`📊 Found ${onnxFiles.length} ONNX models:`);
      onnxFiles.forEach((file) => {
        const stats = fs.statSync(path.join(this.modelsPath, file));
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        this.logger.log(`  - ${file} (${sizeMB} MB)`);
      });
    } catch (error) {
      this.logger.error(`❌ Error listing models: ${error.message}`);
    }
  }

  /**
   * Load ONNX model into memory
   */
  async loadModel(
    modelName: string,
    options?: ort.InferenceSession.SessionOptions,
  ): Promise<ort.InferenceSession> {
    // Check if already loaded
    if (this.sessions.has(modelName)) {
      this.logger.log(`♻️ Using cached session for ${modelName}`);
      return this.sessions.get(modelName);
    }

    const modelPath = path.join(this.modelsPath, modelName);

    if (!fs.existsSync(modelPath)) {
      throw new Error(`Model not found: ${modelPath}`);
    }

    try {
      this.logger.log(`⏳ Loading model: ${modelName}`);
      const startTime = Date.now();

      // Default session options
      const sessionOptions: ort.InferenceSession.SessionOptions = {
        executionProviders: ['cpu'], // Use CPU by default
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true,
        executionMode: 'parallel',
        ...options,
      };

      const session = await ort.InferenceSession.create(modelPath, sessionOptions);
      
      const loadTime = Date.now() - startTime;
      this.logger.log(`✅ Model loaded: ${modelName} (${loadTime}ms)`);

      // Log input/output info
      this.logger.log(`📥 Input names: ${session.inputNames.join(', ')}`);
      this.logger.log(`📤 Output names: ${session.outputNames.join(', ')}`);

      // Cache the session
      this.sessions.set(modelName, session);

      return session;
    } catch (error) {
      this.logger.error(`❌ Failed to load model ${modelName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run inference on loaded model
   */
  async runInference(
    modelName: string,
    inputs: Record<string, ort.Tensor>,
  ): Promise<ort.InferenceSession.OnnxValueMapType> {
    const session = await this.loadModel(modelName);

    try {
      const startTime = Date.now();
      const results = await session.run(inputs);
      const inferenceTime = Date.now() - startTime;

      this.logger.debug(`⚡ Inference completed: ${modelName} (${inferenceTime}ms)`);

      return results;
    } catch (error) {
      this.logger.error(`❌ Inference failed for ${modelName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Preprocess image for face detection model
   * Resize to 640x640 and normalize to [-1, 1]
   */
  async preprocessImageForFaceDetection(imageBuffer: Buffer): Promise<ort.Tensor> {
    try {
      // Resize to 640x640 and convert to RGB
      const { data, info } = await sharp(imageBuffer)
        .resize(640, 640, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Convert to Float32Array and normalize to [-1, 1]
      const float32Data = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        float32Data[i] = (data[i] / 127.5) - 1.0; // Normalize [0, 255] to [-1, 1]
      }

      // Reshape to NCHW format (1, 3, 640, 640)
      const rData = new Float32Array(640 * 640);
      const gData = new Float32Array(640 * 640);
      const bData = new Float32Array(640 * 640);

      for (let i = 0; i < 640 * 640; i++) {
        rData[i] = float32Data[i * 3];
        gData[i] = float32Data[i * 3 + 1];
        bData[i] = float32Data[i * 3 + 2];
      }

      const tensorData = new Float32Array(1 * 3 * 640 * 640);
      tensorData.set(rData, 0);
      tensorData.set(gData, 640 * 640);
      tensorData.set(bData, 640 * 640 * 2);

      return new ort.Tensor('float32', tensorData, [1, 3, 640, 640]);
    } catch (error) {
      this.logger.error(`❌ Image preprocessing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Preprocess image for YOLOv8 detection
   * Resize to 640x640 and normalize to [0, 1]
   */
  async preprocessImageForYolo(imageBuffer: Buffer): Promise<{
    tensor: ort.Tensor;
    originalWidth: number;
    originalHeight: number;
  }> {
    try {
      // Get original dimensions
      const metadata = await sharp(imageBuffer).metadata();
      const originalWidth = metadata.width;
      const originalHeight = metadata.height;

      // Resize to 640x640 maintaining aspect ratio
      const { data, info } = await sharp(imageBuffer)
        .resize(640, 640, { fit: 'contain', background: { r: 114, g: 114, b: 114 } })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Convert to Float32Array and normalize to [0, 1]
      const float32Data = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        float32Data[i] = data[i] / 255.0; // Normalize [0, 255] to [0, 1]
      }

      // Reshape to NCHW format (1, 3, 640, 640)
      const channels = 3;
      const height = 640;
      const width = 640;
      
      const tensorData = new Float32Array(1 * channels * height * width);
      
      for (let c = 0; c < channels; c++) {
        for (let h = 0; h < height; h++) {
          for (let w = 0; w < width; w++) {
            const srcIndex = (h * width + w) * channels + c;
            const dstIndex = c * (height * width) + h * width + w;
            tensorData[dstIndex] = float32Data[srcIndex];
          }
        }
      }

      const tensor = new ort.Tensor('float32', tensorData, [1, 3, height, width]);

      return { tensor, originalWidth, originalHeight };
    } catch (error) {
      this.logger.error(`❌ YOLOv8 preprocessing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Post-process YOLOv8 detection output
   * Apply NMS and filter by confidence threshold
   */
  postprocessYoloOutput(
    output: ort.Tensor,
    originalWidth: number,
    originalHeight: number,
    confidenceThreshold: number = 0.5,
    iouThreshold: number = 0.45,
  ): Array<{
    class: number;
    className: string;
    confidence: number;
    box: { x: number; y: number; width: number; height: number };
  }> {
    const outputData = output.data as Float32Array;
    const dims = output.dims; // [1, 84, 8400] for YOLOv8n

    const numDetections = dims[2]; // 8400
    const numClasses = dims[1] - 4; // 80 classes (84 - 4 box coordinates)

    const detections = [];

    // Extract detections
    for (let i = 0; i < numDetections; i++) {
      // Get box coordinates (cx, cy, w, h)
      const cx = outputData[i];
      const cy = outputData[numDetections + i];
      const w = outputData[2 * numDetections + i];
      const h = outputData[3 * numDetections + i];

      // Get class scores
      let maxScore = 0;
      let maxClass = 0;
      for (let c = 0; c < numClasses; c++) {
        const score = outputData[(4 + c) * numDetections + i];
        if (score > maxScore) {
          maxScore = score;
          maxClass = c;
        }
      }

      // Filter by confidence
      if (maxScore > confidenceThreshold) {
        // Convert from center format to corner format
        const x = (cx - w / 2) / 640 * originalWidth;
        const y = (cy - h / 2) / 640 * originalHeight;
        const width = (w / 640) * originalWidth;
        const height = (h / 640) * originalHeight;

        detections.push({
          class: maxClass,
          className: this.getCocoClassName(maxClass),
          confidence: maxScore,
          box: { x, y, width, height },
        });
      }
    }

    // Apply NMS
    return this.applyNMS(detections, iouThreshold);
  }

  /**
   * Apply Non-Maximum Suppression
   */
  private applyNMS(
    detections: Array<{
      class: number;
      className: string;
      confidence: number;
      box: { x: number; y: number; width: number; height: number };
    }>,
    iouThreshold: number,
  ): typeof detections {
    // Sort by confidence (descending)
    detections.sort((a, b) => b.confidence - a.confidence);

    const keep = [];

    while (detections.length > 0) {
      const current = detections.shift();
      keep.push(current);

      detections = detections.filter((det) => {
        const iou = this.calculateIoU(current.box, det.box);
        return iou < iouThreshold || current.class !== det.class;
      });
    }

    return keep;
  }

  /**
   * Calculate Intersection over Union
   */
  private calculateIoU(
    box1: { x: number; y: number; width: number; height: number },
    box2: { x: number; y: number; width: number; height: number },
  ): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;

    return intersection / union;
  }

  /**
   * Get COCO class name by index
   */
  private getCocoClassName(classIndex: number): string {
    const cocoClasses = [
      'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck',
      'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
      'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra',
      'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
      'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
      'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup',
      'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
      'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
      'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
      'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
      'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
      'toothbrush',
    ];

    return cocoClasses[classIndex] || `class_${classIndex}`;
  }

  /**
   * Unload model from memory
   */
  async unloadModel(modelName: string): Promise<void> {
    if (this.sessions.has(modelName)) {
      const session = this.sessions.get(modelName);
      // ONNX Runtime doesn't have explicit dispose, sessions are GC'd
      this.sessions.delete(modelName);
      this.logger.log(`🗑️ Model unloaded: ${modelName}`);
    }
  }

  /**
   * Get loaded models
   */
  getLoadedModels(): string[] {
    return Array.from(this.sessions.keys());
  }
}
