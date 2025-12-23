# Order Tracking API - Complete Documentation
## Base URL: `track.mangwale.in/api`

This document provides comprehensive documentation for tracking orders by `order_id` in the Dispatcher API. The API supports multiple tracking methods, real-time location updates, status flow tracking, and enhanced analytics.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Order Identification](#order-identification)
4. [Tracking Endpoints](#tracking-endpoints)
   - [User Tracking (Public)](#1-user-tracking-public)
   - [Basic Tracking](#2-basic-tracking)
   - [Live Tracking](#3-live-tracking)
   - [Enhanced Tracking Service](#4-enhanced-tracking-service)
   - [Order Details by CRN](#5-order-details-by-crn)
   - [Mangwale Webhook Tracking](#6-mangwale-webhook-tracking)
   - [Additional Endpoints](#7-additional-order-endpoints)
5. [Data Models](#data-models)
6. [Status Flow](#status-flow)
7. [Error Handling](#error-handling)
8. [Testing Data](#testing-data)
9. [Best Practices](#best-practices)

---

## Overview

The Order Tracking API provides comprehensive tracking capabilities for delivery orders. Orders can be tracked using:
- **Order ID** (e.g., `MW-000001`, `MD0001`)
- **CRN Number** (e.g., `CRN123456`)
- **Request ID** (internal identifier)

The API supports:
- Real-time location tracking
- Status flow history
- Path analytics and statistics
- Multi-provider support (Porter, Mangwale, LoadShare)
- Automatic status detection based on location
- Webhook integration for external systems

---

## Authentication

Most tracking endpoints are **public** and do not require authentication. However, user tracking endpoints require:
- **Order ID** + **Drop Contact Phone Number** (for user tracking)

Some endpoints may require API keys for administrative access (check individual endpoint documentation).

---

## Order Identification

### Order ID Formats
- **Mangwale Orders**: `MW-000001`, `MW-000002`, etc.
- **Multi-Delivery Orders**: `MD0001`, `MD0002`, etc.
- **Legacy Orders**: Various formats depending on provider

### CRN Number
- **CRN** (Customer Reference Number) is the tracking number assigned to orders
- Format varies by provider
- Used for provider-specific tracking

### Request ID
- Internal request identifier
- Format: `req-{timestamp}-{random}`

---

## Tracking Endpoints

### 1. User Tracking (Public)

#### Track Order by Order ID + Phone
**GET** `/api/orders/:orderId/:d_contact/user-track`

Public endpoint for users to track their orders. Requires order ID and drop contact phone number for authentication.

**Parameters:**
- `orderId` (path): Order ID (e.g., `MW-000001`)
- `d_contact` (path): Drop contact phone number (must match order)

**Response:**
```json
{
  "id": 123,
  "order_id": "MW-000001",
  "crn_number": "CRN123456",
  "status": "out_for_delivery",
  "p_address": "123 Restaurant Street, Mumbai",
  "p_latitude": 19.0760,
  "p_longitude": 72.8777,
  "d_address": "456 Customer Avenue, Mumbai",
  "d_latitude": 19.0770,
  "d_longitude": 72.8787,
  "p_contact": "+919876543210",
  "p_contact_name": "Restaurant Owner",
  "d_contact": "+919876543211",
  "d_contact_name": "John Doe",
  "raider_name": "Rider Name",
  "raider_mobile_number": "+919876543212",
  "vehicle_number": "MH01AB1234",
  "flow": [
    {
      "status": "created",
      "timestamp": "2025-01-11T10:00:00.000Z"
    },
    {
      "status": "assigned",
      "timestamp": "2025-01-11T10:05:00.000Z"
    }
  ],
  "location_tracker": [
    {
      "lat": 19.0760,
      "long": 72.8777,
      "update_time": "2025-01-11T12:00:00.000Z",
      "speed_kmph": 25.5,
      "heading_deg": 45,
      "accuracy_m": 10
    }
  ],
  "location": {
    "lat": 19.0760,
    "long": 72.8777,
    "update_time": "2025-01-11T12:00:00.000Z"
  },
  "route_data": [
    {
      "sort_order": 1,
      "pickup": true,
      "drop": false,
      "address": "123 Restaurant Street, Mumbai",
      "locationLat": 19.0760,
      "locationLng": 72.8777,
      "contactPersonName": "Restaurant Owner",
      "phone": "+919876543210"
    },
    {
      "sort_order": 2,
      "pickup": false,
      "drop": true,
      "address": "456 Customer Avenue, Mumbai",
      "locationLat": 19.0770,
      "locationLng": 72.8787,
      "contactPersonName": "John Doe",
      "phone": "+919876543211"
    }
  ],
  "estimated_fare": 150.00,
  "created_at": "2025-01-11T10:00:00.000Z",
  "updated_at": "2025-01-11T12:00:00.000Z"
}
```

**Error Responses:**
- `404`: Order not found
- `400`: Order phone mismatch

---

### 2. Basic Tracking

#### Track Order by CRN (Manual Trigger)
**GET** `/api/track-order/:crn`

Manually trigger a one-off tracking update from the provider (Porter/Mangwale/LoadShare).

**Parameters:**
- `crn` (path): CRN number (tracking number)

**What Happens:**
1. Fetches latest status from provider
2. Updates order status in database
3. Updates location tracker
4. Updates flow (status history)
5. Calculates ETA if applicable

**Response:**
```json
{
  "ok": true,
  "status": "assigned"
}
```

**Special Responses:**
- `{ "skipped": true }` - Order is completed/cancelled
- `{ "skipped": true, "reason": "rate_limited" }` - Provider rate limited

---

#### Track CRN and Get Order
**GET** `/api/orders/crn/:orderId/track`

Track order from provider AND return complete order details in one call.

**Parameters:**
- `orderId` (path): CRN number or order ID

**Response:**
Same as user tracking endpoint, but includes:
- Latest provider status
- Updated location tracker
- Updated flow

---

### 3. Live Tracking

#### Get Live Tracking Data
**GET** `/api/live-track/:crn`

Get real-time live tracking data with current location and status.

**Parameters:**
- `crn` (path): CRN number

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 123,
      "order_id": "MW-000001",
      "crn_number": "CRN123456",
      "status": "out_for_delivery",
      "p_address": "123 Restaurant Street, Mumbai",
      "d_address": "456 Customer Avenue, Mumbai"
    },
    "current_location": {
      "lat": 19.0765,
      "lng": 72.8780,
      "timestamp": "2025-01-11T12:00:00.000Z"
    },
    "rider": {
      "name": "Rider Name",
      "phone": "+919876543212",
      "vehicle_number": "MH01AB1234"
    },
    "eta_minutes": 15,
    "location_history": [
      {
        "lat": 19.0760,
        "lng": 72.8777,
        "timestamp": "2025-01-11T11:55:00.000Z"
      }
    ],
    "status_flow": [
      {
        "status": "created",
        "timestamp": "2025-01-11T10:00:00.000Z"
      }
    ]
  },
  "timestamp": "2025-01-11T12:00:00.000Z"
}
```

---

#### Get Live Status Only
**GET** `/api/live-status/:crn`

Get current live status and location only (lightweight endpoint).

**Response:**
```json
{
  "success": true,
  "data": {
    "crn_number": "CRN123456",
    "status": "out_for_delivery",
    "current_location": {
      "lat": 19.0765,
      "lng": 72.8780
    },
    "rider": {
      "name": "Rider Name",
      "phone": "+919876543212"
    },
    "eta_minutes": 15,
    "updated_at": "2025-01-11T12:00:00.000Z"
  },
  "timestamp": "2025-01-11T12:00:00.000Z"
}
```

---

#### Get Enhanced Tracking (with Path Analytics)
**GET** `/api/live-tracking/:orderId/enhanced`

Get enhanced tracking data with location history and path analytics.

**Parameters:**
- `orderId` (path): Order ID

**Response:**
```json
{
  "success": true,
  "data": {
    "order_info": {
      "id": 123,
      "crn_number": "CRN123456",
      "status": "out_for_delivery",
      "order_type": "single",
      "created_at": "2025-01-11T10:00:00.000Z",
      "updated_at": "2025-01-11T12:00:00.000Z",
      "is_live": true
    },
    "pickup_location": {
      "lat": 19.0760,
      "lng": 72.8777
    },
    "drop_location": {
      "lat": 19.0770,
      "lng": 72.8787
    },
    "current_location": {
      "lat": 19.0765,
      "lng": 72.8780,
      "timestamp": "2025-01-11T12:00:00.000Z"
    },
    "location_history": [
      {
        "lat": 19.0760,
        "long": 72.8777,
        "update_time": "2025-01-11T11:55:00.000Z",
        "speed_kmph": 25.5,
        "heading_deg": 45
      }
    ],
    "status_flow": [
      {
        "status": "created",
        "timestamp": "2025-01-11T10:00:00.000Z"
      }
    ],
    "path_statistics": {
      "total_distance_km": 5.2,
      "total_duration_minutes": 25,
      "average_speed_kmph": 12.5,
      "max_speed_kmph": 35.0,
      "locations_count": 45,
      "path_efficiency": 85.5
    },
    "real_time_data": {
      "last_update": "2025-01-11T12:00:00.000Z",
      "locations_today": 45,
      "is_moving": true
    }
  },
  "timestamp": "2025-01-11T12:00:00.000Z"
}
```

---

#### Get Path Statistics
**GET** `/api/live-tracking/:orderId/path-stats`

Get path statistics for a specific order.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalDistance": 5.2,
    "duration": 25,
    "averageSpeed": 12.5,
    "maxSpeed": 35.0,
    "pointsCount": 45
  },
  "timestamp": "2025-01-11T12:00:00.000Z"
}
```

---

### 4. Enhanced Tracking Service

#### Get Enhanced Tracking Data
**GET** `/api/enhanced-tracking/:crnNumber`

Get comprehensive enhanced tracking data including location history, status flow, path statistics, and auto-detected status.

**Response:**
```json
{
  "success": true,
  "data": {
    "orderDetails": {
      "id": 123,
      "order_id": "MW-000001",
      "crn_number": "CRN123456",
      "status": "out_for_delivery"
    },
    "locationHistory": [
      {
        "lat": 19.0760,
        "long": 72.8777,
        "update_time": "2025-01-11T11:55:00.000Z",
        "speed_kmph": 25.5,
        "heading_deg": 45,
        "accuracy_meters": 10
      }
    ],
    "flowData": [
      {
        "status": "created",
        "timestamp": "2025-01-11T10:00:00.000Z",
        "location": {
          "lat": 19.0760,
          "lng": 72.8777
        }
      }
    ],
    "pathStatistics": {
      "totalDistance": 5.2,
      "duration": 25,
      "averageSpeed": 12.5,
      "maxSpeed": 35.0,
      "pointsCount": 45
    },
    "currentLocation": {
      "lat": 19.0765,
      "lng": 72.8780,
      "update_time": "2025-01-11T12:00:00.000Z",
      "speed_kmph": 25.5,
      "heading_deg": 45
    },
    "autoDetectedStatus": null,
    "lastUpdate": "2025-01-11T12:00:00.000Z"
  }
}
```

---

#### Get Location History
**GET** `/api/enhanced-tracking/:crnNumber/location-history`

Get complete location history for an order.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "lat": 19.0760,
      "long": 72.8777,
      "update_time": "2025-01-11T11:55:00.000Z",
      "speed_kmph": 25.5,
      "heading_deg": 45,
      "accuracy_meters": 10
    }
  ]
}
```

---

#### Get Status Flow Data
**GET** `/api/enhanced-tracking/:crnNumber/status-flow`

Get complete status flow (status change history) for an order.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "status": "created",
      "timestamp": "2025-01-11T10:00:00.000Z",
      "location": {
        "lat": 19.0760,
        "lng": 72.8777
      },
      "rider_id": "rider123",
      "notes": "manual"
    }
  ]
}
```

---

#### Get Current Rider Location
**GET** `/api/enhanced-tracking/:crnNumber/current-location`

Get current rider location for an order.

**Response:**
```json
{
  "success": true,
  "data": {
    "lat": 19.0765,
    "lng": 72.8780,
    "update_time": "2025-01-11T12:00:00.000Z",
    "speed_kmph": 25.5,
    "heading_deg": 45
  }
}
```

---

#### Update Rider Location
**POST** `/api/enhanced-tracking/:crnNumber/location`

Update rider location for an order. Triggers automatic status detection based on proximity to pickup/drop locations.

**Request Body:**
```json
{
  "lat": 19.0760,
  "long": 72.8777,
  "update_time": "2025-01-11T12:00:00.000Z",
  "speed_kmph": 25.5,
  "heading_deg": 45,
  "accuracy_meters": 10
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "crn_number": "CRN123456",
    "location": {
      "lat": 19.0760,
      "long": 72.8777,
      "update_time": "2025-01-11T12:00:00.000Z"
    }
  }
}
```

**Automatic Status Detection:**
- If rider is within 50m of pickup → Status changes to `reached_pickup`
- If rider is within 50m of drop → Status changes to `reached_delivery`
- Status transitions follow the status flow logic

---

#### Update Order Status
**PUT** `/api/enhanced-tracking/:crnNumber/status`

Update order status with flow management.

**Request Body:**
```json
{
  "status": "picked_up",
  "lat": 19.0760,
  "lng": 72.8777,
  "rider_id": "rider123",
  "notes": "Parcel collected from restaurant"
}
```

**Valid Statuses:**
- `created`
- `searching_rider`
- `rider_assigned`
- `on_way_to_pickup`
- `reached_pickup`
- `at_pickup`
- `pickup_done`
- `out_for_delivery`
- `reached_delivery`
- `at_delivery`
- `delivered`
- `cancelled`
- `rto_initiated`
- `rto_delivered`

**Response:**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "crn_number": "CRN123456",
    "status": "picked_up",
    "timestamp": "2025-01-11T12:00:00.000Z"
  }
}
```

---

#### Bulk Location Update
**POST** `/api/enhanced-tracking/bulk-location-update`

Bulk location update for multiple orders (for rider apps).

**Request Body:**
```json
{
  "rider_id": "rider123",
  "orders": [
    {
      "order_id": "MW-000001",
      "location": {
        "lat": 19.0760,
        "long": 72.8777,
        "update_time": "2025-01-11T12:00:00.000Z",
        "speed_kmph": 25.5,
        "heading_deg": 45,
        "accuracy_meters": 10
      }
    },
    {
      "order_id": "MW-000002",
      "location": {
        "lat": 19.0770,
        "long": 72.8787,
        "update_time": "2025-01-11T12:01:00.000Z",
        "speed_kmph": 30.0,
        "heading_deg": 50,
        "accuracy_meters": 10
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk location update completed",
  "data": [
    {
      "order_id": "MW-000001",
      "success": true,
      "data": { ... }
    },
    {
      "order_id": "MW-000002",
      "success": true,
      "data": { ... }
    }
  ]
}
```

---

#### Get Tracking Statuses
**GET** `/api/enhanced-tracking/constants/tracking-statuses`

Get available tracking statuses and status flow.

**Response:**
```json
{
  "success": true,
  "data": {
    "statuses": [
      "created",
      "searching_rider",
      "rider_assigned",
      "on_way_to_pickup",
      "reached_pickup",
      "at_pickup",
      "pickup_done",
      "out_for_delivery",
      "reached_delivery",
      "at_delivery",
      "delivered",
      "cancelled",
      "rto_initiated",
      "rto_delivered"
    ],
    "statusFlow": [
      "created",
      "searching_rider",
      "rider_assigned",
      "on_way_to_pickup",
      "reached_pickup",
      "at_pickup",
      "pickup_done",
      "out_for_delivery",
      "reached_delivery",
      "at_delivery",
      "delivered"
    ]
  }
}
```

---

### 5. Order Details by CRN

#### Get Order Details by CRN
**GET** `/api/orders/crn/:crnNumber`

Get order details by CRN number with statistics.

**Response:**
Same format as user tracking endpoint, includes:
- Complete order object
- Rider information (if assigned)
- Parsed flow and location_tracker
- Pickup and drop details extracted from route_data

---

### 6. Mangwale Webhook Tracking

#### Get Live Tracking (Webhook)
**GET** `/api/webhooks/mangwale/track/:crnNumber`

Get live tracking data via Mangwale webhook endpoint.

**Response:** Same as `/api/live-track/:crn`

---

#### Get Order Status (Webhook)
**GET** `/api/webhooks/mangwale/status/:crnNumber`

Get order status via Mangwale webhook endpoint.

**Response:** Same as `/api/live-status/:crn`

---

#### Get Location History (Webhook)
**GET** `/api/webhooks/mangwale/location/:crnNumber`

Get location history via Mangwale webhook endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "crn_number": "CRN123456",
    "current_location": {
      "lat": 19.0765,
      "lng": 72.8780,
      "timestamp": "2025-01-11T12:00:00.000Z"
    },
    "eta_minutes": 15,
    "rider": {
      "name": "Rider Name",
      "phone": "+919876543212",
      "vehicle_number": "MH01AB1234"
    },
    "location_history": [
      {
        "lat": 19.0760,
        "lng": 72.8777,
        "timestamp": "2025-01-11T11:55:00.000Z"
      }
    ]
  },
  "timestamp": "2025-01-11T12:00:00.000Z"
}
```

---

#### Get Complete History (Webhook)
**GET** `/api/webhooks/mangwale/history/:crnNumber`

Get complete tracking history via Mangwale webhook endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "crn_number": "CRN123456",
    "location_history": [ ... ],
    "status_flow": [ ... ],
    "pickup": {
      "address": "123 Restaurant Street, Mumbai",
      "lat": 19.0760,
      "lng": 72.8777
    },
    "delivery": {
      "address": "456 Customer Avenue, Mumbai",
      "lat": 19.0770,
      "lng": 72.8787
    },
    "current_location": { ... },
    "rider": { ... },
    "proof_data": { ... }
  },
  "timestamp": "2025-01-11T12:00:00.000Z"
}
```

---

#### Post Location Update (Webhook)
**POST** `/api/webhooks/mangwale/location`

Post location update via Mangwale webhook. Accepts `shipment_id` or `dispatcher_order_id`.

**Request Body:**
```json
{
  "shipment_id": "MW-000001",
  "dispatcher_order_id": "123",
  "rider_id": "rider123",
  "lat": 19.0760,
  "lng": 72.8777,
  "accuracy_m": 10,
  "speed_kmph": 25.5,
  "heading_deg": 45,
  "at": "2025-01-11T12:00:00.000Z",
  "status": "out_for_delivery",
  "current_address": "123 Main Street, Mumbai"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "timestamp": "2025-01-11T12:00:00.000Z"
}
```

---

#### Post Status Update (Webhook)
**POST** `/api/webhooks/mangwale/status`

Post status update via Mangwale webhook. Accepts `shipment_id` or `dispatcher_order_id`.

**Request Body:**
```json
{
  "shipment_id": "MW-000001",
  "dispatcher_order_id": "123",
  "rider_id": "rider123",
  "status": "picked_up",
  "at": "2025-01-11T12:00:00.000Z",
  "lat": 19.0760,
  "lng": 72.8777,
  "proof_data": {
    "image_url": "https://example.com/proof.jpg",
    "signature": "base64..."
  },
  "rider_info": {
    "name": "John Doe",
    "phone": "+919876543210"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Status updated successfully",
  "timestamp": "2025-01-11T12:00:00.000Z"
}
```

---

### 7. Additional Order Endpoints

#### Get Remote Order Status
**GET** `/api/orders/:id/remote-status`

Fetch remote (mirrored DB) order status for a local order id.

**Response:**
```json
{
  "remoteStatus": "confirmed"
}
```

---

#### Get Remote Order Details
**GET** `/api/remote/order-details/:orderNumber`

Fetch normalized order details from mirrored admin DB.

**Response:**
Normalized order details response

---

#### Get Shipment Orders
**GET** `/api/orders/shipment/:orderId`

Get all orders for a specific shipment across providers.

**Response:**
Array of orders associated with the shipment

---

## Data Models

### Order Object
```typescript
{
  id: number;
  order_id: string;
  crn_number: string;
  request_id: string;
  status: string;
  service: 'porter' | 'mangwale' | 'loadshare';
  p_address: string;
  p_latitude: number;
  p_longitude: number;
  d_address: string;
  d_latitude: number;
  d_longitude: number;
  p_contact: string;
  p_contact_name: string;
  d_contact: string;
  d_contact_name: string;
  raider_id: number;
  raider_name: string;
  raider_mobile_number: string;
  vehicle_number: string;
  flow: StatusFlowEntry[];
  location_tracker: LocationUpdate[];
  route_data: RouteStop[];
  estimated_fare: number;
  created_at: string;
  updated_at: string;
}
```

### Location Update
```typescript
{
  lat: number;
  long: number;
  update_time: string;
  speed_kmph?: number;
  heading_deg?: number;
  accuracy_meters?: number;
}
```

### Status Flow Entry
```typescript
{
  status: string;
  timestamp: string;
  location?: {
    lat: number;
    lng: number;
  };
  rider_id?: string;
  notes?: string;
}
```

### Route Stop
```typescript
{
  sort_order: number;
  pickup: boolean;
  drop: boolean;
  address: string;
  locationLat: number;
  locationLng: number;
  contactPersonName: string;
  phone: string;
  note?: string;
  landmark?: string;
}
```

---

## Status Flow

The order status follows this flow:

1. **created** - Order created
2. **searching_rider** - Searching for available rider
3. **rider_assigned** - Rider assigned to order
4. **on_way_to_pickup** - Rider on way to pickup location
5. **reached_pickup** - Rider reached pickup location
6. **at_pickup** - Rider at pickup location
7. **pickup_done** - Pickup completed
8. **out_for_delivery** - Order out for delivery
9. **reached_delivery** - Rider reached delivery location
10. **at_delivery** - Rider at delivery location
11. **delivered** - Order delivered

**Terminal Statuses:**
- **cancelled** - Order cancelled
- **rto_initiated** - Return to origin initiated
- **rto_delivered** - Return to origin delivered

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-01-11T12:00:00.000Z"
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Order not found
- `429` - Rate limited
- `500` - Internal server error

### Common Errors
- **Order not found**: Order ID or CRN does not exist
- **Order phone mismatch**: Phone number doesn't match order
- **Invalid status**: Status transition not allowed
- **Rate limited**: Too many requests to provider

---

## Testing Data

### Sample Order IDs
- `MW-000001` - Mangwale single delivery order
- `MW-000002` - Mangwale single delivery order
- `MD0001` - Multi-delivery order
- `MD0002` - Multi-delivery order

### Sample CRN Numbers
- `CRN123456`
- `CRN789012`
- `CRN345678`

### Sample Phone Numbers
- `+919876543210`
- `+919876543211`
- `+919876543212`

### Sample Coordinates (Mumbai)
- **Pickup**: `19.0760, 72.8777` (Mumbai Central)
- **Drop**: `19.0770, 72.8787` (Nearby location)
- **Current Location**: `19.0765, 72.8780` (In transit)

### Sample Request Bodies

#### Location Update
```json
{
  "lat": 19.0760,
  "long": 72.8777,
  "update_time": "2025-01-11T12:00:00.000Z",
  "speed_kmph": 25.5,
  "heading_deg": 45,
  "accuracy_meters": 10
}
```

#### Status Update
```json
{
  "status": "picked_up",
  "lat": 19.0760,
  "lng": 72.8777,
  "rider_id": "rider123",
  "notes": "Parcel collected from restaurant"
}
```

---

## Best Practices

### 1. Tracking Frequency
- **User Tracking**: Poll every 10-30 seconds for active orders
- **Live Tracking**: Poll every 5-10 seconds for real-time updates
- **Manual Tracking**: Use sparingly to avoid rate limits

### 2. Error Handling
- Always check `success` field in responses
- Handle `404` errors gracefully (order may not exist yet)
- Implement retry logic for rate limit errors (429)

### 3. Status Updates
- Use webhook endpoints for real-time updates when possible
- Update location frequently (every 5-10 seconds) for active orders
- Use bulk location update for multiple orders

### 4. Performance
- Use lightweight endpoints (`/live-status/:crn`) for status checks
- Use enhanced endpoints only when detailed analytics needed
- Cache order details when possible

### 5. Security
- User tracking requires phone number verification
- Webhook endpoints should validate signatures if implemented
- Don't expose sensitive rider information unnecessarily

### 6. Data Usage
- Location history can be large; use pagination if available
- Filter location history by timestamp when possible
- Use path statistics for analytics instead of full history

---

## Support

For issues or questions:
- Check API documentation
- Review error messages for specific issues
- Contact API support team

---

**Last Updated**: January 2025
**API Version**: 1.0.0
**Base URL**: `https://track.mangwale.in/api`

