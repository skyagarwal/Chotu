#!/bin/bash

# Test script to verify persona and logging
# Sends a message to the AI service and prints the response

PHONE="919923383838"
MESSAGE="I want to order food"

echo "Sending message: '$MESSAGE' from $PHONE"

curl -X POST http://localhost:3200/test/message \
  -H "Content-Type: application/json" \
  -d "{\"phoneNumber\": \"$PHONE\", \"message\": \"$MESSAGE\"}"

echo -e "\n\nCheck logs to verify persona and database insertion."
