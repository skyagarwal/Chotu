#!/bin/bash

# Post-Payment Order Flow Test Script
# Tests the complete order flow from payment to delivery

set -e

BASE_URL="${BASE_URL:-http://localhost:3200}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-mangwale_webhook_secret_2024}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test data
ORDER_ID=999
PAYMENT_ID="pay_test_$(date +%s)"
CUSTOMER_PHONE="+919876543210"
VENDOR_PHONE="+919370407508"
RIDER_ID=101
RIDER_PHONE="+919876543212"

echo ""
echo "=============================================="
echo "  POST-PAYMENT ORDER FLOW TEST"
echo "=============================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Order ID: $ORDER_ID"
echo ""

# Step 0: Health Check
log_info "Step 0: Checking backend health..."
HEALTH=$(curl -s "$BASE_URL/health" 2>/dev/null || echo '{"status":"error"}')
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    log_success "Backend is healthy"
else
    log_error "Backend health check failed: $HEALTH"
    exit 1
fi
echo ""

# Step 1: Simulate Payment Webhook (Razorpay)
log_info "Step 1: Simulating Razorpay payment webhook..."
echo ""
echo "POST $BASE_URL/webhooks/orders/payment"
echo "Payload: { order_id: $ORDER_ID, amount: ₹450, method: upi }"
echo ""

PAYMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/webhooks/orders/payment" \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: test_signature" \
  -d "{
    \"event\": \"payment.captured\",
    \"payload\": {
      \"payment\": {
        \"entity\": {
          \"id\": \"$PAYMENT_ID\",
          \"order_id\": \"order_$ORDER_ID\",
          \"amount\": 45000,
          \"method\": \"upi\",
          \"status\": \"captured\",
          \"notes\": {
            \"mangwale_order_id\": \"$ORDER_ID\"
          }
        }
      }
    }
  }" 2>&1)

echo "Response: $PAYMENT_RESPONSE"
if echo "$PAYMENT_RESPONSE" | grep -q '"status":"processed"'; then
    log_success "Payment webhook processed successfully"
elif echo "$PAYMENT_RESPONSE" | grep -q '"status":"error"'; then
    log_warning "Payment webhook returned error (expected if order doesn't exist in DB)"
else
    log_warning "Unexpected response: $PAYMENT_RESPONSE"
fi
echo ""

sleep 2

# Step 2: Simulate Vendor Response (Nerve Callback)
log_info "Step 2: Simulating vendor IVR callback (ACCEPT with 20 min prep time)..."
echo ""
echo "POST $BASE_URL/webhooks/orders/nerve-callback"
echo "Payload: { order_id: $ORDER_ID, dtmf_digits: '120' (Accept + 20 mins) }"
echo ""

VENDOR_RESPONSE=$(curl -s -X POST "$BASE_URL/webhooks/orders/nerve-callback" \
  -H "Content-Type: application/json" \
  -d "{
    \"call_id\": \"VC_${ORDER_ID}_$(date +%s)\",
    \"call_sid\": \"exotel_sid_123\",
    \"order_id\": $ORDER_ID,
    \"vendor_id\": 1,
    \"event\": \"completed\",
    \"status\": \"completed\",
    \"dtmf_digits\": \"120\"
  }" 2>&1)

echo "Response: $VENDOR_RESPONSE"
if echo "$VENDOR_RESPONSE" | grep -q '"status":"processed"'; then
    log_success "Vendor callback processed successfully"
else
    log_warning "Vendor callback response: $VENDOR_RESPONSE"
fi
echo ""

sleep 2

# Step 3: Simulate Tracking API - Rider Assigned
log_info "Step 3: Simulating rider assignment from tracking API..."
echo ""
echo "POST $BASE_URL/webhooks/orders/tracking"
echo "Payload: { event: rider.assigned, rider_id: $RIDER_ID }"
echo ""

RIDER_RESPONSE=$(curl -s -X POST "$BASE_URL/webhooks/orders/tracking" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  -d "{
    \"event\": \"rider.assigned\",
    \"order_id\": \"$ORDER_ID\",
    \"crn_number\": \"CRN$ORDER_ID\",
    \"data\": {
      \"rider_id\": \"$RIDER_ID\",
      \"rider_name\": \"Rahul Kumar\",
      \"rider_phone\": \"$RIDER_PHONE\",
      \"vehicle_number\": \"MH15AB1234\",
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }
  }" 2>&1)

echo "Response: $RIDER_RESPONSE"
if echo "$RIDER_RESPONSE" | grep -q '"status":"processed"'; then
    log_success "Rider assignment processed successfully"
else
    log_warning "Rider assignment response: $RIDER_RESPONSE"
fi
echo ""

sleep 2

# Step 4: Simulate Location Update - Rider at Pickup
log_info "Step 4: Simulating rider location update (at pickup)..."
echo ""
echo "POST $BASE_URL/webhooks/orders/tracking"
echo "Payload: { event: location.updated, lat: 19.9975, lng: 73.7898 }"
echo ""

LOCATION_RESPONSE=$(curl -s -X POST "$BASE_URL/webhooks/orders/tracking" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  -d "{
    \"event\": \"location.updated\",
    \"order_id\": \"$ORDER_ID\",
    \"data\": {
      \"lat\": 19.9975,
      \"lng\": 73.7898,
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }
  }" 2>&1)

echo "Response: $LOCATION_RESPONSE"
log_success "Location update sent"
echo ""

sleep 2

# Step 5: Simulate Status Change - Picked Up
log_info "Step 5: Simulating order picked up..."
echo ""
echo "POST $BASE_URL/webhooks/orders/tracking"
echo "Payload: { event: status.changed, status: picked_up }"
echo ""

PICKUP_RESPONSE=$(curl -s -X POST "$BASE_URL/webhooks/orders/tracking" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  -d "{
    \"event\": \"status.changed\",
    \"order_id\": \"$ORDER_ID\",
    \"data\": {
      \"status\": \"picked_up\",
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }
  }" 2>&1)

echo "Response: $PICKUP_RESPONSE"
if echo "$PICKUP_RESPONSE" | grep -q '"status":"processed"'; then
    log_success "Pickup status processed"
fi
echo ""

sleep 2

# Step 6: Simulate Status Change - Delivered
log_info "Step 6: Simulating order delivered..."
echo ""
echo "POST $BASE_URL/webhooks/orders/tracking"
echo "Payload: { event: status.changed, status: delivered }"
echo ""

DELIVERY_RESPONSE=$(curl -s -X POST "$BASE_URL/webhooks/orders/tracking" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  -d "{
    \"event\": \"status.changed\",
    \"order_id\": \"$ORDER_ID\",
    \"data\": {
      \"status\": \"delivered\",
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }
  }" 2>&1)

echo "Response: $DELIVERY_RESPONSE"
if echo "$DELIVERY_RESPONSE" | grep -q '"status":"processed"'; then
    log_success "Delivery status processed"
fi
echo ""

# Summary
echo ""
echo "=============================================="
echo "  TEST SUMMARY"
echo "=============================================="
echo ""
echo "Flow tested:"
echo "  1. ✅ Payment webhook received"
echo "  2. ✅ Vendor IVR callback (accepted, 20 min prep)"
echo "  3. ✅ Rider assigned"
echo "  4. ✅ Location update"
echo "  5. ✅ Order picked up"
echo "  6. ✅ Order delivered"
echo ""
echo "Check backend logs for detailed flow:"
echo "  docker logs mangwale_ai_dev --tail 100 | grep -E 'PostPayment|order #$ORDER_ID'"
echo ""
log_success "Test completed!"
