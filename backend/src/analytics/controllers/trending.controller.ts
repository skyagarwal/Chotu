import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

interface TrendingQuery {
  query: string;
  count: number;
  trend: number;
  module: string;
  velocity: 'rising' | 'stable' | 'falling';
}

interface TrendingProduct {
  product_id: string;
  name: string;
  category: string;
  orders: number;
  trend: number;
  revenue: number;
}

interface TrendingLocation {
  location: string;
  top_queries: string[];
  total_searches: number;
  change: number;
}

@ApiTags('trending')
@Controller('trending')
export class TrendingController {

  @Get()
  @ApiOperation({ summary: 'Get all trending data' })
  @ApiQuery({ name: 'range', required: false, description: 'Time range (1h, 24h, 7d, 30d)' })
  @ApiResponse({ status: 200, description: 'Trending data retrieved' })
  async getTrendingData(@Query('range') range: string = '24h') {
    const queries = await this.getTrendingQueries(range);
    const products = await this.getTrendingProducts(range);
    const locations = await this.getTrendingLocations(range);

    return {
      queries,
      products,
      locations,
      range,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('queries')
  @ApiOperation({ summary: 'Get trending search queries' })
  @ApiQuery({ name: 'range', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'module', required: false })
  @ApiResponse({ status: 200, description: 'Trending queries retrieved' })
  async getTrendingQueries(
    @Query('range') range: string = '24h',
    @Query('limit') limit: number = 20,
    @Query('module') module?: string,
  ): Promise<TrendingQuery[]> {
    // In a real implementation, this would query the search_log table
    // and calculate trends based on time windows
    const mockQueries: TrendingQuery[] = [
      { query: 'pizza delivery', count: 2450, trend: 245, module: 'Food', velocity: 'rising' },
      { query: 'grocery home delivery', count: 1890, trend: 189, module: 'Ecom', velocity: 'rising' },
      { query: 'urgent parcel', count: 1560, trend: 156, module: 'Parcel', velocity: 'rising' },
      { query: 'airport taxi', count: 1340, trend: 134, module: 'Ride', velocity: 'stable' },
      { query: 'medicine delivery', count: 980, trend: 98, module: 'Health', velocity: 'rising' },
      { query: 'biryani near me', count: 876, trend: 87, module: 'Food', velocity: 'rising' },
      { query: 'cab booking', count: 765, trend: 45, module: 'Ride', velocity: 'stable' },
      { query: 'track my order', count: 654, trend: -12, module: 'General', velocity: 'falling' },
      { query: 'vegetable delivery', count: 543, trend: 67, module: 'Ecom', velocity: 'rising' },
      { query: 'late night food', count: 432, trend: 89, module: 'Food', velocity: 'rising' },
    ];

    // Filter by module if specified
    let filtered = mockQueries;
    if (module && module !== 'all') {
      filtered = mockQueries.filter(q => q.module.toLowerCase() === module.toLowerCase());
    }

    return filtered.slice(0, limit);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get trending products' })
  @ApiQuery({ name: 'range', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'Trending products retrieved' })
  async getTrendingProducts(
    @Query('range') range: string = '24h',
    @Query('limit') limit: number = 10,
    @Query('category') category?: string,
  ): Promise<TrendingProduct[]> {
    // In a real implementation, this would query order data
    const mockProducts: TrendingProduct[] = [
      { product_id: '1', name: 'Margherita Pizza', category: 'Food', orders: 345, trend: 156, revenue: 69000 },
      { product_id: '2', name: 'Chicken Biryani', category: 'Food', orders: 298, trend: 89, revenue: 59600 },
      { product_id: '3', name: 'Onions (1kg)', category: 'Grocery', orders: 567, trend: 45, revenue: 17010 },
      { product_id: '4', name: 'Milk Packet', category: 'Grocery', orders: 890, trend: 23, revenue: 44500 },
      { product_id: '5', name: 'Cough Syrup', category: 'Medicine', orders: 234, trend: 78, revenue: 28080 },
      { product_id: '6', name: 'Paneer Butter Masala', category: 'Food', orders: 276, trend: 112, revenue: 55200 },
      { product_id: '7', name: 'Rice (5kg)', category: 'Grocery', orders: 445, trend: 34, revenue: 89000 },
      { product_id: '8', name: 'Paracetamol', category: 'Medicine', orders: 189, trend: 56, revenue: 7560 },
    ];

    // Filter by category if specified
    let filtered = mockProducts;
    if (category && category !== 'all') {
      filtered = mockProducts.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    return filtered.slice(0, limit);
  }

  @Get('locations')
  @ApiOperation({ summary: 'Get trending by location' })
  @ApiQuery({ name: 'range', required: false })
  @ApiResponse({ status: 200, description: 'Location trends retrieved' })
  async getTrendingLocations(
    @Query('range') range: string = '24h',
  ): Promise<TrendingLocation[]> {
    // In a real implementation, this would group search data by location
    const mockLocations: TrendingLocation[] = [
      { location: 'Indore', top_queries: ['pizza', 'grocery', 'medicine'], total_searches: 5670, change: 23 },
      { location: 'Bhopal', top_queries: ['cab', 'food', 'parcel'], total_searches: 4320, change: 15 },
      { location: 'Mumbai', top_queries: ['late night food', 'cab'], total_searches: 8900, change: 34 },
      { location: 'Delhi', top_queries: ['grocery', 'medicine'], total_searches: 7650, change: 28 },
      { location: 'Bangalore', top_queries: ['food delivery', 'grocery'], total_searches: 6540, change: 19 },
      { location: 'Hyderabad', top_queries: ['biryani', 'ride'], total_searches: 5430, change: 21 },
      { location: 'Chennai', top_queries: ['pharmacy', 'food'], total_searches: 4890, change: 17 },
      { location: 'Pune', top_queries: ['parcel', 'medicine'], total_searches: 4210, change: 14 },
    ];

    return mockLocations;
  }

  @Get('peak-hours')
  @ApiOperation({ summary: 'Get peak usage hours' })
  @ApiQuery({ name: 'range', required: false })
  @ApiResponse({ status: 200, description: 'Peak hours data retrieved' })
  async getPeakHours(@Query('range') range: string = '24h') {
    // In a real implementation, this would analyze request timestamps
    const peakHours = [
      { hour: '12:00 - 14:00', label: 'Lunch Rush', percent: 85, requests: 12500 },
      { hour: '19:00 - 21:00', label: 'Dinner Peak', percent: 92, requests: 15800 },
      { hour: '09:00 - 11:00', label: 'Morning Orders', percent: 65, requests: 9200 },
      { hour: '15:00 - 17:00', label: 'Afternoon', percent: 45, requests: 6500 },
      { hour: '22:00 - 00:00', label: 'Late Night', percent: 55, requests: 7800 },
      { hour: '06:00 - 09:00', label: 'Early Morning', percent: 35, requests: 4200 },
    ];

    return { peak_hours: peakHours, range };
  }

  @Get('module-distribution')
  @ApiOperation({ summary: 'Get search volume by module' })
  @ApiQuery({ name: 'range', required: false })
  @ApiResponse({ status: 200, description: 'Module distribution retrieved' })
  async getModuleDistribution(@Query('range') range: string = '24h') {
    const distribution = [
      { module: 'Food', percent: 35, count: 45000, color: '#f97316' },
      { module: 'Ecom', percent: 28, count: 36000, color: '#3b82f6' },
      { module: 'Ride', percent: 18, count: 23000, color: '#22c55e' },
      { module: 'Parcel', percent: 12, count: 15500, color: '#8b5cf6' },
      { module: 'Health', percent: 7, count: 9000, color: '#ef4444' },
    ];

    return { distribution, range };
  }

  @Get('real-time')
  @ApiOperation({ summary: 'Get real-time trending data' })
  @ApiResponse({ status: 200, description: 'Real-time data retrieved' })
  async getRealTimeTrends() {
    // Simulated real-time data
    const now = new Date();
    
    return {
      current_searches_per_minute: Math.floor(150 + Math.random() * 50),
      active_sessions: Math.floor(500 + Math.random() * 100),
      orders_in_progress: Math.floor(80 + Math.random() * 30),
      top_query_now: 'pizza delivery',
      busiest_location: 'Mumbai',
      timestamp: now.toISOString(),
    };
  }
}
