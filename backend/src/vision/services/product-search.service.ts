import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { OnnxRuntimeService } from './onnx-runtime.service';
import { ProductSearchResult } from '../dto/product-search.dto';
import { firstValueFrom } from 'rxjs';

/**
 * Product Search by Image Service
 * "I want to buy this" - Visual product search
 */
@Injectable()
export class ProductSearchService {
  private readonly logger = new Logger(ProductSearchService.name);
  private readonly modelName = 'yolov8n.onnx';

  constructor(
    private readonly onnxRuntime: OnnxRuntimeService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Search products by image
   * Customer takes photo and says "I want to buy this"
   */
  async searchProductByImage(
    imageBuffer: Buffer,
    maxResults: number = 10,
  ): Promise<ProductSearchResult> {
    try {
      // Step 1: Detect objects in image
      const { tensor, originalWidth, originalHeight } =
        await this.onnxRuntime.preprocessImageForYolo(imageBuffer);

      const outputs = await this.onnxRuntime.runInference(this.modelName, {
        images: tensor,
      });

      const detections = this.onnxRuntime.postprocessYoloOutput(
        outputs.output0,
        originalWidth,
        originalHeight,
        0.4,
        0.45,
      );

      if (detections.length === 0) {
        return {
          products: [],
          detectedObjects: [],
          searchQuery: 'No objects detected',
          totalResults: 0,
        };
      }

      // Step 2: Get primary object (highest confidence)
      const primaryObject = detections.reduce((max, obj) =>
        obj.confidence > max.confidence ? obj : max,
      );

      // Step 3: Generate search query from detected objects
      const searchQuery = this.generateSearchQuery(detections);

      // Step 4: Search product catalog (integrate with admin backend)
      const products = await this.searchProductCatalog(
        searchQuery,
        primaryObject.className,
        maxResults,
      );

      return {
        products,
        detectedObjects: detections.map((d) => ({
          className: d.className,
          confidence: d.confidence,
          boundingBox: d.box,
        })),
        searchQuery,
        totalResults: products.length,
      };
    } catch (error) {
      this.logger.error(`Product search by image failed: ${error.message}`);
      throw error;
    }
  }

  private generateSearchQuery(detections: any[]): string {
    // Sort by confidence and take top 3
    const topDetections = detections
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    return topDetections.map((d) => d.className).join(', ');
  }

  private async searchProductCatalog(
    searchQuery: string,
    primaryCategory: string,
    maxResults: number,
  ): Promise<ProductSearchResult['products']> {
    try {
      // TODO: Integrate with actual admin backend product search API
      // For now, return mock results based on detected object

      const mockProducts = this.getMockProducts(primaryCategory, searchQuery);
      return mockProducts.slice(0, maxResults);
    } catch (error) {
      this.logger.error(`Product catalog search failed: ${error.message}`);
      return [];
    }
  }

  private getMockProducts(category: string, searchQuery: string): ProductSearchResult['products'] {
    // Mock product database for common categories
    const productDatabase = {
      apple: [
        { name: 'Fresh Red Apples (1kg)', category: 'Fruits', confidence: 0.95, matchedFeatures: ['red color', 'round shape'], estimatedPrice: 120, availability: true },
        { name: 'Organic Green Apples (500g)', category: 'Fruits', confidence: 0.88, matchedFeatures: ['green color', 'fresh'], estimatedPrice: 90, availability: true },
      ],
      banana: [
        { name: 'Ripe Bananas (Dozen)', category: 'Fruits', confidence: 0.92, matchedFeatures: ['yellow color', 'curved shape'], estimatedPrice: 60, availability: true },
        { name: 'Organic Bananas (6 pcs)', category: 'Fruits', confidence: 0.85, matchedFeatures: ['organic', 'yellow'], estimatedPrice: 45, availability: true },
      ],
      bottle: [
        { name: 'Mineral Water 1L', category: 'Beverages', confidence: 0.90, matchedFeatures: ['bottle shape', 'transparent'], estimatedPrice: 20, availability: true },
        { name: 'Soft Drink 500ml', category: 'Beverages', confidence: 0.75, matchedFeatures: ['bottle', 'colorful'], estimatedPrice: 40, availability: true },
      ],
      person: [
        { name: 'No products available', category: 'N/A', confidence: 0, matchedFeatures: [], estimatedPrice: 0, availability: false },
      ],
    };

    return productDatabase[category] || [
      {
        name: `${category.charAt(0).toUpperCase() + category.slice(1)} - Search Results`,
        category: 'General',
        confidence: 0.7,
        matchedFeatures: ['visual match'],
        estimatedPrice: 0,
        availability: false,
      },
    ];
  }
}
