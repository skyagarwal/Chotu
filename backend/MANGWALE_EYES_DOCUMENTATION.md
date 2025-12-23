# 👁️ Mangwale Eyes - AI Vision System

**Comprehensive Computer Vision System for Customer-Facing Use Cases**

## Overview

Mangwale Eyes is a powerful AI vision system integrated into the Mangwale AI backend. It provides multiple computer vision capabilities for real-world business applications, from food quality assessment to attendance tracking.

## 🌟 Features

### 1. 🍕 Food Quality Assessment
**Customer sends photos of food to check quality**

- **Endpoint**: `POST /vision/food/analyze`
- **Use Cases**:
  - Restaurant food quality checks
  - Customer complaints with photo evidence
  - Food freshness assessment
  - Presentation and plating analysis

**Request**:
```bash
curl -X POST http://localhost:3200/vision/food/analyze \
  -F "image=@food.jpg"
```

**Response**:
```json
{
  "quality": "excellent|good|fair|poor|spoiled",
  "confidence": 0.92,
  "freshness": 85,
  "visualAppeal": 78,
  "detectedIssues": [],
  "recommendation": "Excellent quality food! Safe to serve to customers.",
  "details": {
    "color": "Detected: pizza, bowl",
    "texture": "Unable to determine from static image",
    "portionSize": "Large portion",
    "plating": "Professional plating"
  }
}
```

---

### 2. 🛒 Product Search by Image
**"I want to buy this" - Visual product search**

- **Endpoint**: `POST /vision/product/search`
- **Use Cases**:
  - Customer takes photo and asks "I want to buy this"
  - Visual product catalog search
  - Product identification from images
  - E-commerce integration

**Request**:
```bash
curl -X POST http://localhost:3200/vision/product/search \
  -F "image=@product.jpg" \
  -F "maxResults=10"
```

**Response**:
```json
{
  "products": [
    {
      "name": "Fresh Red Apples (1kg)",
      "category": "Fruits",
      "confidence": 0.95,
      "matchedFeatures": ["red color", "round shape"],
      "estimatedPrice": 120,
      "availability": true
    }
  ],
  "detectedObjects": [
    {
      "className": "apple",
      "confidence": 0.95,
      "boundingBox": { "x": 100, "y": 150, "width": 200, "height": 220 }
    }
  ],
  "searchQuery": "apple, bowl, fork",
  "totalResults": 1
}
```

---

### 3. 🔢 Object Counting from Images
**Count anything - people, items, objects**

- **Endpoint**: `POST /vision/count`
- **Use Cases**:
  - Count people in a crowd
  - Inventory counting from photos
  - Item verification (e.g., "Did you receive all 10 items?")
  - Event attendance estimation

**Request**:
```bash
curl -X POST http://localhost:3200/vision/count \
  -F "image=@crowd.jpg" \
  -F "target=people" \
  -F "confidenceThreshold=0.5"
```

**Response**:
```json
{
  "totalCount": 15,
  "breakdown": {
    "person": {
      "count": 15,
      "confidence": 0.92,
      "locations": [
        { "x": 100, "y": 150, "width": 80, "height": 200 },
        { "x": 300, "y": 120, "width": 85, "height": 210 }
      ]
    }
  },
  "summary": "Total: 15 | Detected: 15 persons"
}
```

**Quick People Count**:
```bash
curl -X POST http://localhost:3200/vision/count/people \
  -F "image=@group.jpg"
```

Response: `{ "count": 5 }`

**Targets**:
- `people` - Count only people
- `vehicles` - Count cars, trucks, motorcycles, etc.
- `items` - Count all objects except people/vehicles
- `all` - Count everything
- `specificClasses` - Count specific objects (e.g., ["apple", "orange", "banana"])

---

### 4. 👔 Attendance System with Face Recognition
**Automated attendance using face detection**

- **Endpoints**:
  - `POST /vision/attendance/register` - Register employee face
  - `POST /vision/attendance/mark` - Mark attendance (check-in/out)
  - `GET /vision/attendance/:employeeId` - Get attendance logs

#### Register Employee Face
```bash
curl -X POST http://localhost:3200/vision/attendance/register \
  -F "image=@employee_photo.jpg" \
  -F "employeeId=EMP001" \
  -F "name=John Doe" \
  -F "department=Sales"
```

Response:
```json
{
  "success": true,
  "employeeId": "EMP001",
  "name": "John Doe",
  "message": "Face registered successfully"
}
```

#### Mark Attendance
```bash
curl -X POST http://localhost:3200/vision/attendance/mark \
  -F "image=@face.jpg" \
  -F "action=check_in" \
  -F "location=Office Main Entrance" \
  -F "deviceId=DEVICE001"
```

Response:
```json
{
  "success": true,
  "employeeId": "EMP001",
  "employeeName": "John Doe",
  "action": "check_in",
  "timestamp": "2025-11-13T22:30:00.000Z",
  "confidence": 0.85,
  "facesDetected": 1,
  "matchedFace": {
    "employeeId": "EMP001",
    "name": "John Doe",
    "confidence": 0.85
  },
  "message": "Attendance marked successfully for John Doe"
}
```

#### Get Attendance Logs
```bash
curl "http://localhost:3200/vision/attendance/EMP001?startDate=2025-11-01&endDate=2025-11-30"
```

---

### 5. 🎥 Live Camera Recognition (Coming Soon)
**Real-time RTSP camera streaming with recognition**

- **Endpoint**: `GET /vision/cameras/:id/stream`
- **Use Cases**:
  - Live person detection at entrance
  - Automated attendance via camera
  - Security monitoring
  - Customer flow analysis

---

## 🚀 Technical Stack

### ONNX Runtime
- **Local inference** - No external API calls
- **CPU execution** - Works without GPU
- **Models**:
  - `yolov8n.onnx` (13 MB) - 80 COCO object classes
  - `detection_10g.onnx` (1.3 MB) - Face detection

### COCO Classes (80 Objects)
YOLOv8 can detect:
- **People**: person
- **Food Items**: banana, apple, sandwich, orange, broccoli, carrot, hot dog, pizza, donut, cake
- **Tableware**: bottle, wine glass, cup, fork, knife, spoon, bowl
- **Vehicles**: car, motorcycle, airplane, bus, train, truck, boat
- **Animals**: bird, cat, dog, horse, sheep, cow, elephant, bear, zebra, giraffe
- **Furniture**: chair, couch, potted plant, bed, dining table, toilet, tv
- **Electronics**: laptop, mouse, remote, keyboard, cell phone, microwave, oven
- **And more**: backpack, umbrella, handbag, tie, suitcase, frisbee, skis, sports ball, kite, baseball bat, etc.

### Services Architecture

```
VisionModule
├── OnnxRuntimeService (Core ONNX inference)
├── FoodQualityService (Food assessment)
├── ProductSearchService (Product identification)
├── CountingService (Object counting)
├── AttendanceService (Face recognition)
├── PpeDetectionService (Safety equipment)
├── ImageAnalysisService (General analysis)
├── FaceRecognitionService (Face detection)
└── CameraManagementService (RTSP streaming)
```

## 📱 Mobile Integration

### WhatsApp Webhook
Customers can send images via WhatsApp:

```javascript
// WhatsApp sends image → Vision API processes → Returns result

// Food quality check
Customer sends food photo → Analyze quality → Reply with assessment

// Product search
Customer: "I want to buy this" + photo → Search products → Reply with matches

// Counting
Customer sends warehouse photo → Count items → Reply with count
```

### Direct API Integration
Mobile apps can integrate directly:

```javascript
// React Native / Flutter
const formData = new FormData();
formData.append('image', {
  uri: photoUri,
  type: 'image/jpeg',
  name: 'photo.jpg',
});

const response = await fetch('http://localhost:3200/vision/food/analyze', {
  method: 'POST',
  body: formData,
});
```

## 🔧 Configuration

### Environment Variables
```env
# Vision Service
FACE_API_URL=http://localhost:8021 (deprecated - using local ONNX)
```

### Model Paths
- Models stored in: `/home/ubuntu/Devs/mangwale-ai/src/vision/models/`
- Add new ONNX models by dropping them in this folder

## 📊 Performance

- **YOLOv8 Inference**: ~100-300ms per image (CPU)
- **Face Detection**: ~50-100ms per image (CPU)
- **Preprocessing**: ~20-50ms per image
- **Concurrent Requests**: Unlimited (stateless services)

## 🛠️ Development

### Testing Endpoints

```bash
# Health check
curl http://localhost:3200/vision/health

# Test with sample image
curl -X POST http://localhost:3200/vision/count/people \
  -F "image=@test_image.jpg"
```

### Adding New Capabilities

1. Create new service in `src/vision/services/`
2. Add DTOs in `src/vision/dto/`
3. Register in `src/vision/vision.module.ts`
4. Add endpoints in `src/vision/controllers/vision.controller.ts`

## 🚨 Current Limitations

1. **Face Recognition**: Using simplified embedding (not production-ready)
   - TODO: Integrate ArcFace or FaceNet for proper face recognition
   
2. **PPE Detection**: Standard COCO classes (no specific PPE items like helmets, vests)
   - TODO: Train custom model for PPE detection

3. **Database Storage**: Attendance service uses in-memory storage
   - TODO: Connect to PostgreSQL (Prisma schema already exists)

4. **RTSP Streaming**: Not yet implemented
   - TODO: Add fluent-ffmpeg for camera streaming

5. **Product Catalog**: Using mock data
   - TODO: Integrate with actual admin backend product API

## 🎯 Next Steps

1. **Live Camera Integration**
   - RTSP streaming support
   - Real-time face recognition
   - Automated attendance via camera

2. **Advanced Face Recognition**
   - ArcFace embedding model
   - Face matching with cosine similarity
   - Face clustering and deduplication

3. **Product Catalog Integration**
   - Connect to admin backend products API
   - Visual similarity search
   - Product recommendations

4. **Database Persistence**
   - Store employee faces in PostgreSQL
   - Persistent attendance logs
   - Analytics and reporting

5. **Performance Optimization**
   - GPU support for ONNX Runtime
   - Model quantization
   - Batch inference

## 📖 API Documentation

Full API documentation available at:
- Swagger UI: `http://localhost:3200/api-docs` (if configured)
- Health check: `http://localhost:3200/vision/health`

## 🤝 Support

For issues or questions:
- Check logs in terminal
- Review service health: `GET /vision/health`
- Enable debug logging in NestJS config

---

**Built with ❤️ for Mangwale AI Platform**
