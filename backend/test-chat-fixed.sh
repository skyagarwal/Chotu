#!/bin/bash

echo "Sending WhatsApp-compatible webhook payload..."

curl -X POST 'http://localhost:3200/webhook/whatsapp' \
  -H 'Content-Type: application/json' \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
        "changes": [
          {
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "15555555555",
                "phone_number_id": "PHONE_NUMBER_ID"
              },
              "contacts": [
                {
                  "profile": {
                    "name": "Test User"
                  },
                  "wa_id": "919999999999"
                }
              ],
              "messages": [
                {
                  "from": "919999999999",
                  "id": "wamid.HBgMOTE5OTk5OTk5OTk5FQIAERgSRkJGOUVDN0ZCMjRGMjA2N0E2AA==",
                  "timestamp": "1702365487",
                  "text": {
                    "body": "hello"
                  },
                  "type": "text"
                }
              ]
            },
            "field": "messages"
          }
        ]
      }
    ]
  }' | jq .
