# Mangwale AI - Vendor/Delivery/Customer Integration Enhancement

## Overview

This document summarizes the comprehensive enhancements made to the Mangwale AI system for vendor, delivery man, and customer integration.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MANGWALE AI SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌───────────────┐     ┌───────────────┐     ┌───────────────┐            │
│   │   Customer    │     │    Vendor     │     │  Delivery Man │            │
│   │   WhatsApp    │     │   WhatsApp    │     │   WhatsApp    │            │
│   └───────┬───────┘     └───────┬───────┘     └───────┬───────┘            │
│           │                     │                     │                     │
│           └─────────────────────┼─────────────────────┘                     │
│                                 │                                           │
│                    ┌────────────▼────────────┐                              │
│                    │   User Type Detector    │                              │
│                    │   (Detect user role)    │                              │
│                    └────────────┬────────────┘                              │
│                                 │                                           │
│        ┌────────────────────────┼────────────────────────┐                  │
│        │                        │                        │                  │
│        ▼                        ▼                        ▼                  │
│  ┌───────────┐          ┌─────────────┐          ┌──────────────┐          │
│  │ Customer  │          │   Vendor    │          │ Delivery Man │          │
│  │   Flows   │          │   Flows     │          │    Flows     │          │
│  └─────┬─────┘          └──────┬──────┘          └──────┬───────┘          │
│        │                       │                        │                   │
│        └───────────────────────┼────────────────────────┘                   │
│                                │                                            │
│                    ┌───────────▼───────────┐                                │
│                    │    PHP API Service    │◄────────────────┐              │
│                    │  (new.mangwale.com)   │                 │              │
│                    └───────────┬───────────┘                 │              │
│                                │                             │              │
│                    ┌───────────▼───────────┐     ┌───────────┴───────────┐  │
│                    │   Order Webhook       │     │  Multi-Channel        │  │
│                    │   Controller          │◄────┤  Notification Service │  │
│                    └───────────────────────┘     └───────────────────────┘  │
│                                                              │               │
│                                              ┌───────────────┼───────────┐   │
│                                              │               │           │   │
│                                              ▼               ▼           ▼   │
│                                        ┌─────────┐   ┌──────────┐  ┌──────┐│
│                                        │   FCM   │   │ WhatsApp │  │Voice ││
│                                        │  Push   │   │ (156)    │  │(151) ││
│                                        └─────────┘   └──────────┘  └──────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## New Services Created

### 1. User Type Detector Service
**File:** `src/php-integration/services/user-type-detector.service.ts`

**Purpose:** Detects whether an incoming user is a customer, vendor, or delivery man based on their phone number.

**Key Features:**
- Checks all three user types in parallel
- Handles multi-role users (same phone can be customer + vendor)
- Provides role selection prompts in EN/HI/MR
- Returns recommended role based on context (active orders, deliveries)

**API Methods:**
```typescript
detectUserType(phone: string): Promise<UserTypeResult>
generateRoleSelectionPrompt(result: UserTypeResult, language: 'en' | 'hi' | 'mr'): string
```

### 2. Vendor Notification Service
**File:** `src/php-integration/services/vendor-notification.service.ts`

**Purpose:** Multi-channel notification system for vendors with fallback strategy.

**Notification Channels:**
1. **FCM Push** (immediate) - Uses `zone_wise_topic` from PHP backend
2. **WhatsApp** (2 min fallback) - Via 192.168.0.156
3. **Voice IVR** (5 min fallback) - Via Mercury 192.168.0.151 Exotel
4. **SMS** (final fallback)

**Key Features:**
- Multilingual messages (EN/HI/MR)
- Order summary formatting
- Accept/Reject quick replies
- Timeout escalation

### 3. Order Webhook Controller
**File:** `src/php-integration/controllers/order-webhook.controller.ts`

**Purpose:** Receives webhooks from PHP backend for real-time order updates.

**Webhook Events:**
- `order.created` - New order (after payment)
- `order.status_changed` - Status transitions
- `order.assigned` - Delivery man assignment
- `order.payment` - Payment status changes

**Notifications Triggered:**
| Event | Customer | Vendor | Delivery Man |
|-------|----------|--------|--------------|
| Order Created | ✅ | ✅ | - |
| Order Confirmed | ✅ | - | - |
| Order Preparing | ✅ | - | - |
| Order Ready | ✅ | - | ✅ |
| Order Picked Up | ✅ | - | - |
| Order Delivered | ✅ | - | - |

## Updated Services

### 1. PHP Vendor Auth Service
**File:** `src/php-integration/services/php-vendor-auth.service.ts`

**New Methods:**
```typescript
// OTP-based authentication
sendVendorOtp(emailOrPhone: string, vendorType: 'owner' | 'employee'): Promise<...>
verifyVendorOtp(emailOrPhone: string, otp: string, vendorType: 'owner' | 'employee'): Promise<...>

// Updated password login
vendorLogin(emailOrPhone: string, password: string, vendorType: 'owner' | 'employee'): Promise<...>
```

**Vendor Types:**
- `owner` - Full store access
- `employee` - Limited access under an owner

## New YAML Flows

### 1. User Type Detection Flow
**File:** `src/flows/yaml/user-type-detection.flow.yaml`

Runs at the start of every conversation to:
- Detect user type from phone
- Show role selection for multi-role users
- Route to appropriate flow

### 2. Customer Order Status Flow
**File:** `src/flows/yaml/customer-order-status.flow.yaml`

Features:
- View active orders
- Track order in real-time
- Contact delivery partner
- Cancel order (if allowed)
- View order history

### 3. Payment Completion Flow
**File:** `src/flows/yaml/payment-completion.flow.yaml`

Handles post-payment experience:
- Payment confirmation message
- Trigger vendor notification
- Handle payment failures
- Proactive status notifications

## Infrastructure Integration

### Mercury (192.168.0.151) - Voice Stack
```
Services:
- mangwale_voice_agent_v2 (8091)
- exotel-service (3100)
- voice_gateway (7100-7101)
```

**Used For:**
- IVR calls to vendors for urgent order notifications
- Voice confirmations when vendors don't respond to push/WhatsApp

### Jupiter (192.168.0.156) - Main AI Stack
```
Services:
- mangwale_ai_service (3200)
- vLLM (8002)
- NLU service (7010)
- OpenSearch (9200)
- Traefik (80/443)
```

**Used For:**
- Main AI processing
- WhatsApp integration
- All business logic

## Configuration Required

Add to `docker-compose.yml` environment:

```yaml
environment:
  # Notification Services
  - WHATSAPP_SERVICE_URL=http://192.168.0.156:3200
  - VOICE_SERVICE_URL=http://192.168.0.151:8091
  - FCM_SERVER_KEY=your_fcm_server_key
  
  # Webhook Security
  - ORDER_WEBHOOK_SECRET=your_webhook_secret
  
  # Timeouts (optional)
  - VENDOR_WHATSAPP_TIMEOUT=120000  # 2 minutes
  - VENDOR_VOICE_TIMEOUT=300000     # 5 minutes
```

## PHP Backend Webhook Configuration

The PHP backend needs to send webhooks to:
```
POST https://ai.mangwale.com/webhook/order
Headers:
  Content-Type: application/json
  X-Webhook-Secret: your_webhook_secret
```

Webhook payload structure defined in `OrderWebhookPayload` interface.

## Order Flow Summary

```
Customer Places Order
        │
        ▼
Payment Processing (Razorpay)
        │
        ▼
Payment Success Webhook
        │
        ├──► Customer: "Payment Successful! Order sent to restaurant"
        │
        ▼
Vendor Notification (FCM Push)
        │
        ├──► (No response in 2 min) ──► WhatsApp Notification
        │
        ├──► (No response in 5 min) ──► IVR Voice Call
        │
        ▼
Vendor Accepts Order
        │
        ├──► Customer: "Order Confirmed! Preparing in X minutes"
        │
        ▼
Vendor Sets Processing Time
        │
        ▼
Order Ready (Handover)
        │
        ├──► Customer: "Order Ready! Finding delivery partner"
        ├──► Delivery Man: "New pickup at [Store]"
        │
        ▼
Delivery Man Assigned
        │
        ├──► Customer: "Delivery partner assigned - [Name], [Phone]"
        │
        ▼
Order Picked Up
        │
        ├──► Customer: "On the way! ETA X minutes" + Live Tracking
        │
        ▼
Order Delivered
        │
        ├──► Customer: "Delivered! Rate your experience"
        │
        ▼
Feedback Request
```

## Testing Endpoints

### User Type Detection
```bash
curl -X POST http://localhost:3200/api/detect-user \
  -H "Content-Type: application/json" \
  -d '{"phone": "9370407508"}'
```

### Order Webhook (Simulated)
```bash
curl -X POST http://localhost:3200/webhook/order \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: mangwale_webhook_secret_2024" \
  -d '{
    "event": "order.created",
    "order": {"id": 123, "order_id": "#MNG-123", "status": "pending", "total_amount": 450},
    "customer": {"id": 1, "name": "Test", "phone": "9876543210"},
    "vendor": {"id": 1, "store_name": "Test Store", "phone": "9370407508"},
    "items": [{"name": "Biryani", "quantity": 2, "price": 200}],
    "timestamp": "2024-01-15T10:30:00Z"
  }'
```

## Files Modified/Created

### Created Files:
1. `src/php-integration/services/user-type-detector.service.ts`
2. `src/php-integration/services/vendor-notification.service.ts`
3. `src/php-integration/controllers/order-webhook.controller.ts`
4. `src/flows/yaml/user-type-detection.flow.yaml`
5. `src/flows/yaml/customer-order-status.flow.yaml`
6. `src/flows/yaml/payment-completion.flow.yaml`

### Modified Files:
1. `src/php-integration/services/php-vendor-auth.service.ts` - Added OTP methods
2. `src/php-integration/php-integration.module.ts` - Registered new services

## Next Steps

1. **Deploy Changes**
   ```bash
   cd /home/ubuntu/Devs/MangwaleAI/backend
   docker-compose up -d --build
   ```

2. **Configure PHP Backend Webhooks**
   - Add webhook trigger on order status changes
   - Configure webhook URL and secret

3. **Test Multi-Channel Notifications**
   - Verify FCM topic subscription
   - Test WhatsApp message delivery
   - Test voice IVR integration

4. **Monitor and Optimize**
   - Check notification delivery rates
   - Adjust timeout values based on vendor response times
   - Add analytics for notification effectiveness
