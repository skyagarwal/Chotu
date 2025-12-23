#!/bin/bash

BASE_URL="http://localhost:3200/api/chat"
USER_ID="test-user-smoke-1"

echo "==================== Clearing Session ===================="
curl -s -X POST "$BASE_URL/session/$USER_ID/clear" | jq .

echo -e "\n\n==================== 1. Start: I want to send a parcel ===================="
curl -s -X POST "$BASE_URL/send"   -H "Content-Type: application/json"   -d "{\"recipientId\": \"$USER_ID\", \"text\": \"I want to send a parcel\", \"type\": \"text\"}" | jq .

echo -e "\n\n==================== 2. Auth: Sending Phone Number ===================="
curl -s -X POST "$BASE_URL/send"   -H "Content-Type: application/json"   -d "{\"recipientId\": \"$USER_ID\", \"text\": \"8888777766\", \"type\": \"text\"}" | jq .

echo -e "\n\n==================== 3. Auth: Sending OTP ===================="
curl -s -X POST "$BASE_URL/send"   -H "Content-Type: application/json"   -d "{\"recipientId\": \"$USER_ID\", \"text\": \"123456\", \"type\": \"text\"}" | jq .

# Wait a bit for auth to settle
sleep 2

echo -e "\n\n==================== 4. Re-Trigger: I want to send a parcel ===================="
curl -s -X POST "$BASE_URL/send"   -H "Content-Type: application/json"   -d "{\"recipientId\": \"$USER_ID\", \"text\": \"I want to send a parcel\", \"type\": \"text\"}" | jq .

echo -e "\n\n==================== 5. Flow: Pickup Location (Nashik) ===================="
curl -s -X POST "$BASE_URL/send"   -H "Content-Type: application/json"   -d "{\"recipientId\": \"$USER_ID\", \"text\": \"City Center Mall, Nashik\", \"type\": \"text\"}" | jq .

echo -e "\n\n==================== 6. Flow: Drop Location (College Road) ===================="
curl -s -X POST "$BASE_URL/send"   -H "Content-Type: application/json"   -d "{\"recipientId\": \"$USER_ID\", \"text\": \"College Road\", \"type\": \"text\"}" | jq .

echo -e "\n\n==================== 7. Flow: Recipient Details ===================="
curl -s -X POST "$BASE_URL/send"   -H "Content-Type: application/json"   -d "{\"recipientId\": \"$USER_ID\", \"text\": \"John Doe 9876543210\", \"type\": \"text\"}" | jq .

echo -e "\n\n==================== 8. Flow: Vehicle Selection ===================="
curl -s -X POST "$BASE_URL/send"   -H "Content-Type: application/json"   -d "{\"recipientId\": \"$USER_ID\", \"text\": \"bike\", \"type\": \"text\"}" | jq .

echo -e "\n\n==================== 9. Flow: Confirm Order ===================="
curl -s -X POST "$BASE_URL/send"   -H "Content-Type: application/json"   -d "{\"recipientId\": \"$USER_ID\", \"text\": \"yes\", \"type\": \"text\"}" | jq .
