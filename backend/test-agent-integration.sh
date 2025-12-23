#!/bin/bash

echo "🤖 TESTING AGENT SYSTEM INTEGRATION"
echo "===================================="
echo ""

# Test 1: Search Query
echo "📝 Test 1: Search Query (SearchAgent)"
echo "Query: 'show me pizza under 500 rupees'"
echo ""
curl -s http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "+919876543210",
    "text": "show me pizza under 500 rupees"
  }' | jq '.'
echo ""
echo "=========================================="
echo ""

sleep 2

# Test 2: Complaint
echo "📝 Test 2: Complaint (ComplaintsAgent)"
echo "Query: 'my food was cold and I want a refund'"
echo ""
curl -s http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "+919876543210",
    "text": "my food was cold and I want a refund"
  }' | jq '.'
echo ""
echo "=========================================="
echo ""

sleep 2

# Test 3: Parcel Booking
echo "📝 Test 3: Parcel Booking (BookingAgent)"
echo "Query: 'I need to send a package'"
echo ""
curl -s http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "+919876543210",
    "text": "I need to send a package"
  }' | jq '.'
echo ""
echo "=========================================="
echo ""

sleep 2

# Test 4: General Query
echo "📝 Test 4: General Query"
echo "Query: 'hello'"
echo ""
curl -s http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "+919876543210",
    "text": "hello"
  }' | jq '.'
echo ""
echo "=========================================="
echo ""

echo "✅ Testing complete!"
echo ""
echo "Check the logs for agent execution:"
echo "  pm2 logs mangwale-ai --lines 100"
