# 🌍 Mangwale AI - Multilingual Support Guide

**Last Updated:** January 27, 2025  
**Version:** 2.0  
**Languages:** English, Hindi (Hinglish), Marathi

---

## 📊 Overview

Mangwale AI now supports **3 languages** across all modules with **216 multilingual training examples** for E-commerce and Parcel modules.

### Supported Languages
- ✅ **English (en)** - Primary language
- ✅ **Hindi/Hinglish (hi)** - Mix of Hindi words in English script (e.g., "mujhe doodh chahiye")
- ✅ **Marathi (mr)** - Marathi in English script (e.g., "mala dudh pahije")

---

## 🎯 Multilingual Training Data

### E-commerce Module (120 examples)

**Intents Supported:**
1. `search_product` - Search or browse products
2. `add_to_cart` - Add items to shopping cart
3. `view_cart` - View cart contents
4. `checkout` - Proceed to payment
5. `track_order` - Track order status
6. `filter_products` - Apply product filters
7. `remove_from_cart` - Remove items from cart
8. `get_offers` - View offers and discounts
9. `product_details` - Get product information
10. `check_availability` - Check stock availability

**Example Queries:**

| Intent | English | Hindi (Hinglish) | Marathi |
|--------|---------|------------------|---------|
| Search | "Show me milk products" | "mujhe doodh chahiye" | "mala dudh pahije" |
| Add to Cart | "Add 2 liters milk" | "2 liter doodh cart mein daalo" | "2 liter dudh cart madhe ghala" |
| Checkout | "I want to checkout" | "checkout karna hai" | "checkout karaycha aahe" |
| Track | "Where is my order" | "mera order kaha hai" | "majha order kuthe aahe" |

### Parcel Module (96 examples)

**Intents Supported:**
1. `book_parcel` - Book parcel delivery
2. `track_parcel` - Track parcel status
3. `modify_booking` - Modify parcel booking
4. `get_pricing` - Get delivery pricing
5. `check_serviceability` - Check service availability
6. `schedule_pickup` - Schedule pickup time
7. `get_delivery_time` - Get delivery estimates
8. `report_issue` - Report parcel issues

**Example Queries:**

| Intent | English | Hindi (Hinglish) | Marathi |
|--------|---------|------------------|---------|
| Book | "Send package to Mumbai" | "Mumbai parcel bhejo" | "Mumbai la parcel pathva" |
| Track | "Track my parcel" | "mera parcel kaha hai" | "majha parcel kuthe aahe" |
| Pricing | "How much to Mumbai" | "Mumbai bhejne ka kitna" | "Mumbai pathavayala kiti" |
| Schedule | "Pickup tomorrow" | "kal pickup karo" | "udya pickup kara" |

---

## 🚀 Using Multilingual Features

### Via Web Chat API

```bash
# English Query
curl -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "user_123",
    "text": "Show me Amul milk products"
  }'

# Hindi Query
curl -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "user_123",
    "text": "mujhe amul ka doodh chahiye"
  }'

# Marathi Query
curl -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "user_123",
    "text": "mala amul cha dudh pahije"
  }'
```

### Via WhatsApp

Users can send messages in any of the three languages. The system will automatically detect the language and respond appropriately.

**Example Conversation (Hindi):**
```
User: mujhe pizza order karna hai
Bot: Bilkul! Kaun sa restaurant pasand karenge?
User: Dominos
Bot: Dominos se kya order karenge?
```

**Example Conversation (Marathi):**
```
User: mala pizza order karaycha aahe
Bot: Nakkach! Konta restaurant avadto?
User: Dominos
Bot: Dominos pasun kay order karaycha?
```

---

## 🧠 NLU Training Status

### Current Models

| Module | Version | Language Support | Training Examples | Status |
|--------|---------|------------------|-------------------|--------|
| E-commerce | v2 | en, hi, mr | 120 | ✅ Trained |
| Parcel | v2 | en, hi, mr | 96 | ✅ Trained |
| Food | v1 | en | 120 | ✅ Trained |
| Ride | v1 | en | 120 | ✅ Trained |
| Health | v1 | en | 120 | ✅ Trained |
| Rooms | v1 | en | 120 | ✅ Trained |
| Movies | v1 | en | 120 | ✅ Trained |
| Services | v1 | en | 120 | ✅ Trained |

### Training Statistics

- **Total Datasets:** 14
- **Total Training Jobs:** 27
- **Success Rate:** 100% (23/23 succeeded)
- **Multilingual Datasets:** 2 (Ecom, Parcel)
- **Total Multilingual Examples:** 216

---

## 🔤 Common Translations

### Shopping Terms

| English | Hindi (Hinglish) | Marathi |
|---------|------------------|---------|
| Milk | doodh | dudh |
| Cart | cart | cart |
| Order | order | order |
| Buy | kharidna | kharaycha |
| Show | dikhao | dakhva |
| I want | mujhe chahiye | mala pahije |
| How much | kitna | kiti |
| Add | daalo | ghala |
| Remove | nikalo | kadha |
| Price | kimat | kimat |

### Parcel Terms

| English | Hindi (Hinglish) | Marathi |
|---------|------------------|---------|
| Parcel | parcel | parcel |
| Send | bhejo | pathva |
| Track | track karo | track kara |
| Where | kaha | kuthe |
| When | kab | kevha |
| Pickup | pickup | pickup |
| Delivery | delivery | delivery |
| Package | package | package |
| Tomorrow | kal | udya |
| Today | aaj | aaj |

---

## 📱 Channel-Specific Features

### WhatsApp
- ✅ Auto language detection
- ✅ Code-mixed input support (e.g., "mujhe 2 milk bottles chahiye")
- ✅ Response in user's preferred language
- ✅ Fallback to English if unsure

### Web Chat
- ✅ All 3 languages supported
- ✅ No language selection needed
- ✅ Automatic language detection
- ✅ Mixed language support

### Telegram
- ✅ Same as WhatsApp
- ✅ Unicode support for all languages
- ✅ Emoji support

### Voice (ASR)
- ✅ English voice input
- 🔄 Hindi voice (requires Hindi ASR model)
- 🔄 Marathi voice (requires Marathi ASR model)

---

## 🎯 Best Practices

### For Users
1. **Be Natural** - Write as you speak
2. **Mix Languages** - "mujhe 2 liter milk chahiye" works fine
3. **Use Common Words** - System trained on real user patterns
4. **Correct Yourself** - System understands context

### For Developers
1. **Log Language Patterns** - Track which languages are used most
2. **Expand Vocabulary** - Add regional variations
3. **Test Continuously** - Validate multilingual accuracy
4. **Monitor Confidence** - Low confidence = needs more training

---

## 📊 Performance Metrics

### Target Accuracy
- **English:** >90% intent accuracy
- **Hindi:** >85% intent accuracy
- **Marathi:** >85% intent accuracy

### Current Performance
- E-commerce v2: Training completed ✅
- Parcel v2: Training completed ✅
- Need real-world testing to measure accuracy

---

## 🚀 Next Steps

### Phase 1: Expand Datasets ✅ COMPLETE
- ✅ Created E-commerce multilingual dataset (120 examples)
- ✅ Created Parcel multilingual dataset (96 examples)
- ✅ Trained both models successfully

### Phase 2: Expand to Other Modules
- 🔄 Food module multilingual
- 🔄 Ride module multilingual
- 🔄 Health module multilingual
- 🔄 Rooms module multilingual
- 🔄 Movies module multilingual
- 🔄 Services module multilingual

### Phase 3: Advanced Features
- 🔄 Language preference storage per user
- 🔄 Automatic language switching mid-conversation
- 🔄 Regional dialect support (e.g., Mumbai Hindi vs Delhi Hindi)
- 🔄 Voice input/output in all languages

### Phase 4: Production Optimization
- 🔄 A/B testing multilingual vs English-only
- 🔄 Performance monitoring by language
- 🔄 User feedback collection
- 🔄 Continuous model improvement

---

## 🛠️ Testing Commands

### Test NLU Classification

```bash
# English
curl -X POST http://localhost:8080/nlu/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "Show me milk", "provider": "nlu.trained.ecom"}'

# Hindi
curl -X POST http://localhost:8080/nlu/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "doodh dikhao", "provider": "nlu.trained.ecom"}'

# Marathi
curl -X POST http://localhost:8080/nlu/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "dudh dakhva", "provider": "nlu.trained.ecom"}'
```

### Test End-to-End

```bash
# Send multilingual message
curl -X POST http://localhost:3200/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "test_user",
    "text": "mujhe doodh chahiye"
  }'

# Check response
curl http://localhost:3200/chat/messages/test_user
```

---

## 📞 Support

For issues or questions:
- **Documentation:** This file
- **Training Dashboard:** http://localhost:3000/admin/training
- **API Docs:** http://localhost:8080/api-docs
- **Logs:** `docker logs mangwale_ai_service`

---

**🎉 Mangwale AI is now multilingual! 🌍**

Supporting 470+ million Hindi speakers and 83+ million Marathi speakers across India.
