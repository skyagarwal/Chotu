# Integration Clients Documentation

## Overview

HTTP clients for integrating mangwale-ai with admin-backend services. These clients replace direct service calls with HTTP API requests, enabling proper service separation.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              mangwale-ai (NestJS - Port 3200)           │
├─────────────────────────────────────────────────────────┤
│  src/integrations/                                      │
│    ├── payment.client.ts      (Payment HTTP client)    │
│    ├── routing.client.ts      (Routing HTTP client)    │
│    ├── integrations.module.ts (NestJS module)          │
│    └── index.ts               (Exports)                │
└─────────────────────────────────────────────────────────┘
         ↓ HTTP POST/GET
         ↓ JSON Requests
         ↓
┌─────────────────────────────────────────────────────────┐
│         mangwale-admin-backend (Express - Port 3002)    │
├─────────────────────────────────────────────────────────┤
│  /api/payments/*            (Payment service)           │
│  /api/delivery-routing/*    (Routing service)           │
└─────────────────────────────────────────────────────────┘
```

## Installation

### 1. Add to App Module

Edit `src/app.module.ts`:

```typescript
import { IntegrationsModule } from './integrations';

@Module({
  imports: [
    // ... existing imports
    IntegrationsModule,
  ],
  // ... rest of module
})
export class AppModule {}
```

### 2. Environment Variable

Add to `.env`:

```bash
ADMIN_BACKEND_URL=http://localhost:3002
```

### 3. Inject Clients

In any service or controller:

```typescript
import { PaymentClient, RoutingClient } from './integrations';

@Injectable()
export class YourService {
  constructor(
    private readonly paymentClient: PaymentClient,
    private readonly routingClient: RoutingClient,
  ) {}
}
```

## Payment Client

### Methods

#### `initiatePayment(params)`

Create a new payment transaction.

```typescript
const transaction = await this.paymentClient.initiatePayment({
  phpOrderId: 12345,
  amount: 599.00,
  currency: 'INR',
  customer: {
    name: 'John Doe',
    phone: '+919876543210',
    email: 'john@example.com',
  },
  description: 'Order #12345',
  returnUrl: 'https://yourapp.com/payment/return',
  webhookUrl: 'https://yourapp.com/api/payments/webhooks/razorpay',
  metadata: {
    orderId: 12345,
    customField: 'value',
  },
  provider: 'razorpay', // optional, defaults to configured provider
});

console.log(`Payment URL: ${transaction.paymentUrl}`);
console.log(`Transaction ID: ${transaction.id}`);
```

#### `getTransaction(id)`

Get payment transaction by ID.

```typescript
const transaction = await this.paymentClient.getTransaction(123);

if (transaction) {
  console.log(`Status: ${transaction.status}`);
  console.log(`Amount: ${transaction.amount} ${transaction.currency}`);
}
```

#### `getTransactionsByOrderId(orderId)`

Get all payment transactions for an order.

```typescript
const transactions = await this.paymentClient.getTransactionsByOrderId(12345);

console.log(`Found ${transactions.length} payment attempts`);
transactions.forEach(tx => {
  console.log(`- ${tx.id}: ${tx.status} (${tx.amount} ${tx.currency})`);
});
```

#### `getLatestTransactionForOrder(orderId)`

Get most recent payment transaction for an order.

```typescript
const latest = await this.paymentClient.getLatestTransactionForOrder(12345);

if (latest) {
  console.log(`Latest status: ${latest.status}`);
}
```

#### `getStats(filters?)`

Get payment statistics.

```typescript
const stats = await this.paymentClient.getStats({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  provider: 'razorpay',
});

if (stats) {
  console.log(`Total: ${stats.totalTransactions} transactions`);
  console.log(`Revenue: ₹${stats.totalAmount}`);
  console.log(`Success Rate: ${stats.successRate}%`);
  console.log(`Average: ₹${stats.averageAmount}`);
}
```

#### `testProvider(provider)`

Test payment provider connection.

```typescript
const result = await this.paymentClient.testProvider('razorpay');

if (result.success) {
  console.log('✅ Payment provider is working');
} else {
  console.log('❌ Payment provider failed:', result.message);
}
```

#### `healthCheck()`

Check if payment service is available.

```typescript
const isHealthy = await this.paymentClient.healthCheck();

if (!isHealthy) {
  console.warn('⚠️  Payment service unavailable');
}
```

## Routing Client

### Methods

#### `calculateDistance(from, to)`

Calculate distance between two points.

```typescript
const result = await this.routingClient.calculateDistance(
  { latitude: 19.0760, longitude: 72.8777 }, // From
  { latitude: 19.1136, longitude: 72.8697 }  // To
);

if (result) {
  console.log(`Distance: ${result.distance_km} km`);
  console.log(`Duration: ${result.duration_min} minutes`);
}
```

#### `calculateBulkDistances(source, destinations)`

Calculate distances to multiple destinations (efficient).

```typescript
const stores = [
  { latitude: 19.1136, longitude: 72.8697, id: 101, name: 'Store A' },
  { latitude: 19.0500, longitude: 72.8500, id: 102, name: 'Store B' },
  { latitude: 19.1200, longitude: 72.9000, id: 103, name: 'Store C' },
];

const result = await this.routingClient.calculateBulkDistances(
  { latitude: 19.0760, longitude: 72.8777 }, // User location
  stores
);

if (result) {
  console.log(`Calculated ${result.destinations.length} distances in ${result.computation_time_ms}ms`);
  
  // Results are sorted by distance (nearest first)
  result.destinations.forEach((dest, index) => {
    console.log(`${index + 1}. ${dest.name}: ${dest.distance_km} km (${dest.duration_min} min)`);
  });
}
```

#### `estimateDeliveryTime(travel, prep, buffer?)`

Estimate total delivery time.

```typescript
const estimate = await this.routingClient.estimateDeliveryTime(
  15,  // Travel time (minutes)
  20,  // Preparation time (minutes)
  10   // Buffer percentage (optional, defaults to server config)
);

if (estimate) {
  console.log(`Travel: ${estimate.travel_time_min} min`);
  console.log(`Prep: ${estimate.preparation_time_min} min`);
  console.log(`Buffer: ${estimate.buffer_time_min} min`);
  console.log(`Total: ${estimate.total_time_min} min`);
  console.log(`Estimate: ${estimate.formatted_estimate}`);
}
```

#### `findNearest(source, locations, limit?)`

Find nearest locations from a source.

```typescript
const nearest = await this.routingClient.findNearest(
  { latitude: 19.0760, longitude: 72.8777 }, // User location
  stores,
  5  // Get top 5 nearest (optional)
);

if (nearest) {
  console.log(`Top 5 nearest stores:`);
  nearest.forEach((store, index) => {
    console.log(`${index + 1}. ${store.name}: ${store.distance_km} km`);
  });
}
```

#### `enrichWithDistance(items, userLocation)`

Enrich items with distance and delivery time.

```typescript
// Enrich search results with distance data
const enrichedResults = await this.routingClient.enrichWithDistance(
  searchResults, // Array of items with latitude/longitude
  userLocation   // User's location
);

enrichedResults.forEach(item => {
  if (item.distance_km) {
    console.log(`${item.name}:`);
    console.log(`  Distance: ${item.distance_km} km`);
    console.log(`  Travel: ${item.duration_min} min`);
    console.log(`  Delivery: ${item.delivery_time_estimate}`);
  }
});
```

#### `healthCheck()`

Check routing service health.

```typescript
const health = await this.routingClient.healthCheck();

if (health) {
  console.log(`OSRM Available: ${health.available}`);
  console.log(`Response Time: ${health.response_time_ms}ms`);
  console.log(`Fallback Mode: ${health.fallback_mode}`);
}
```

## Error Handling

### Network Errors

Clients handle network errors gracefully:

```typescript
try {
  const result = await this.paymentClient.initiatePayment(params);
} catch (error) {
  if (error.message.includes('unavailable')) {
    // Service is down
    this.logger.error('Payment service unavailable');
  } else if (error.message.includes('timeout')) {
    // Request timed out
    this.logger.error('Payment service timeout');
  } else {
    // Other error
    this.logger.error('Payment failed:', error.message);
  }
}
```

### Null Returns

Most methods return `null` on failure instead of throwing:

```typescript
const result = await this.routingClient.calculateDistance(from, to);

if (!result) {
  // Handle failure (service down, network error, etc.)
  this.logger.warn('Could not calculate distance, using fallback');
  return this.useFallbackDistance();
}

// Use result
console.log(`Distance: ${result.distance_km} km`);
```

### Logging

All operations are logged:

```
💳 Payment Client initialized: http://localhost:3002
Initiating payment for order #12345
✅ Payment initiated: Transaction #1
❌ Payment initiation failed: connect ECONNREFUSED

🗺️  Routing Client initialized: http://localhost:3002
Calculating distance: 19.0760,72.8777 → 19.1136,72.8697
✅ Bulk distances calculated in 145ms
⚠️  Routing service unavailable, returning null
```

## Migration Guide

### Before (Direct Service Calls)

```typescript
// Old code in mangwale-ai
import { PaymentService } from '../payments/payment.service';
import { OSRMService } from '../routing/osrm.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly osrmService: OSRMService,
  ) {}

  async createOrder() {
    // Direct service call
    const payment = await this.paymentService.initiatePayment(params);
    
    // Direct service call
    const distance = await this.osrmService.calculateDistance(from, to);
  }
}
```

### After (HTTP Client Calls)

```typescript
// New code in mangwale-ai
import { PaymentClient, RoutingClient } from './integrations';

@Injectable()
export class OrderService {
  constructor(
    private readonly paymentClient: PaymentClient,
    private readonly routingClient: RoutingClient,
  ) {}

  async createOrder() {
    // HTTP API call to admin-backend
    const payment = await this.paymentClient.initiatePayment(params);
    
    // HTTP API call to admin-backend
    const distance = await this.routingClient.calculateDistance(from, to);
  }
}
```

**Changes needed**:
1. Import `PaymentClient` instead of `PaymentService`
2. Import `RoutingClient` instead of `OSRMService`
3. Method names stay the same (mostly compatible)
4. Add `IntegrationsModule` to your module's imports

## Performance

### Request Timeouts

- Default timeout: 10 seconds
- Health checks: 3-5 seconds
- Configurable in `HttpModule.register()`

### Bulk Operations

Always prefer bulk operations when possible:

**❌ Inefficient** (N network requests):
```typescript
for (const store of stores) {
  const distance = await this.routingClient.calculateDistance(userLoc, store);
}
```

**✅ Efficient** (1 network request):
```typescript
const result = await this.routingClient.calculateBulkDistances(userLoc, stores);
```

### Caching

Consider caching results for frequently requested data:

```typescript
// Cache payment transactions
const cacheKey = `payment_${orderId}`;
let transaction = await this.cache.get(cacheKey);

if (!transaction) {
  transaction = await this.paymentClient.getLatestTransactionForOrder(orderId);
  await this.cache.set(cacheKey, transaction, 60); // Cache 60 seconds
}
```

## Testing

### Mock Clients

For unit tests, mock the clients:

```typescript
const mockPaymentClient = {
  initiatePayment: jest.fn().mockResolvedValue({
    id: 1,
    paymentUrl: 'https://mock-payment-url',
    status: 'created',
  }),
  getTransaction: jest.fn().mockResolvedValue(null),
};

const mockRoutingClient = {
  calculateDistance: jest.fn().mockResolvedValue({
    distance_km: 5.5,
    duration_min: 15,
  }),
};

// Use in tests
const module = await Test.createTestingModule({
  providers: [
    YourService,
    { provide: PaymentClient, useValue: mockPaymentClient },
    { provide: RoutingClient, useValue: mockRoutingClient },
  ],
}).compile();
```

## Troubleshooting

### Service Unavailable

```typescript
// Check health before operations
const isHealthy = await this.paymentClient.healthCheck();

if (!isHealthy) {
  throw new ServiceUnavailableException('Payment service is down');
}
```

### Timeouts

Increase timeout for slow networks:

```typescript
// In integrations.module.ts
HttpModule.register({
  timeout: 30000, // 30 seconds
})
```

### Wrong URL

Verify environment variable:

```bash
echo $ADMIN_BACKEND_URL
# Should output: http://localhost:3002
```

### CORS Issues

Ensure admin-backend allows requests from mangwale-ai origin.

## Best Practices

1. ✅ **Always check for null returns** before using results
2. ✅ **Use bulk operations** when calculating multiple distances
3. ✅ **Log errors** for debugging
4. ✅ **Set appropriate timeouts** based on operation
5. ✅ **Cache frequently accessed data** (payment status, etc.)
6. ✅ **Handle network failures gracefully** (don't crash the app)
7. ✅ **Monitor health checks** in production
8. ✅ **Use async/await** properly (don't block)

## Environment Variables

```bash
# Admin Backend URL (required)
ADMIN_BACKEND_URL=http://localhost:3002

# For production
ADMIN_BACKEND_URL=https://admin-backend.yourapp.com
```

## Summary

Integration clients provide:
- ✅ Clean separation between AI orchestration and business services
- ✅ HTTP-based communication (standard, scalable)
- ✅ Graceful error handling
- ✅ Comprehensive logging
- ✅ Type-safe interfaces
- ✅ Production-ready
- ✅ Easy to test

**Next Steps**: Update agents to use these clients instead of direct service calls.
