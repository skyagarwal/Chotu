#!/usr/bin/env ts-node
/**
 * Real Order E2E Test
 * 
 * Complete end-to-end test using actual vendor and store data:
 * - Vendor: mangwale002@gmail.com (Demo Restaurant, Store ID: 269)
 * - Customer: dgbairagi002@gmail.com / 9067735173
 * 
 * Flow tested:
 * 1. Vendor login
 * 2. Get store items
 * 3. Search items via AI service
 * 4. Simulate order placement
 * 5. Test webhook notifications
 * 6. Simulate order status changes
 * 7. Test vendor notifications
 */

import axios from 'axios';

const AI_SERVICE_URL = 'http://localhost:3200';
const PHP_BACKEND_URL = 'https://new.mangwale.com';
const WEBHOOK_SECRET = 'mangwale_webhook_secret_2024';

// Real vendor credentials
const VENDOR = {
  email: 'mangwale002@gmail.com',
  password: 'Mangwale@2025',
  storeId: 269,
  storeName: 'Demo Restaurant',
  storePhone: '+919130952532',
  zoneId: 4,
};

// Real customer credentials
const CUSTOMER = {
  email: 'dgbairagi002@gmail.com',
  phone: '9067735173',
  password: 'Deepali@0903',
  name: 'Dipali Bairagi',
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: string = colors.reset) {
  console.log(color + message + colors.reset);
}

function section(title: string) {
  console.log('\n' + colors.bright + colors.magenta);
  console.log('═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
  console.log(colors.reset);
}

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

// ========================================
// TEST FUNCTIONS
// ========================================

async function testVendorLogin(): Promise<string> {
  section('1. VENDOR LOGIN');
  
  log('Logging in as vendor owner...', colors.cyan);
  
  const response = await axios.post(`${PHP_BACKEND_URL}/api/v1/auth/vendor/login`, {
    email: VENDOR.email,
    password: VENDOR.password,
    vendor_type: 'owner',
  });
  
  const token = response.data.token;
  const zoneTopic = response.data.zone_wise_topic;
  
  log(`✅ Vendor logged in successfully`, colors.green);
  log(`   Token: ${token.substring(0, 30)}...`, colors.blue);
  log(`   Zone Topic: ${zoneTopic}`, colors.blue);
  log(`   Module Type: ${response.data.module_type}`, colors.blue);
  
  return token;
}

async function getStoreItems(): Promise<OrderItem[]> {
  section('2. GET STORE ITEMS');
  
  log(`Searching items from ${VENDOR.storeName} (ID: ${VENDOR.storeId})...`, colors.cyan);
  
  // Use AI service search
  const response = await axios.get(`${AI_SERVICE_URL}/api/search/food`, {
    params: { q: '*', store_id: VENDOR.storeId, limit: 10 }
  });
  
  const items = response.data.items || [];
  
  log(`✅ Found ${items.length} items:`, colors.green);
  items.forEach((item: any) => {
    log(`   - ${item.name}: ₹${item.price} (ID: ${item.id})`, colors.blue);
  });
  
  // Return first 2 items for order
  return items.slice(0, 2).map((item: any) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: 1,
  }));
}

async function testNLUOrderIntent(query: string): Promise<void> {
  section('3. TEST NLU ORDER INTENT');
  
  log(`Testing NLU classification for: "${query}"`, colors.cyan);
  
  const response = await axios.post(`${AI_SERVICE_URL}/api/nlu/classify`, {
    text: query,
  });
  
  log(`✅ Classification result:`, colors.green);
  log(`   Intent: ${response.data.intent}`, colors.blue);
  log(`   Confidence: ${response.data.confidence}`, colors.blue);
  log(`   Tone: ${response.data.tone?.sentiment || 'N/A'}`, colors.blue);
}

async function simulateOrderCreation(items: OrderItem[]): Promise<string> {
  section('4. SIMULATE ORDER CREATION');
  
  const orderId = `TEST-${Date.now()}`;
  const orderAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryCharge = 30;
  const totalAmount = orderAmount + deliveryCharge;
  
  log(`Creating order ${orderId}...`, colors.cyan);
  log(`   Items: ${items.map(i => `${i.name} x${i.quantity}`).join(', ')}`, colors.blue);
  log(`   Order Amount: ₹${orderAmount}`, colors.blue);
  log(`   Delivery Charge: ₹${deliveryCharge}`, colors.blue);
  log(`   Total: ₹${totalAmount}`, colors.blue);
  
  // Simulate order by triggering webhook
  const webhookPayload = {
    event: 'order.created',
    order: {
      id: parseInt(orderId.split('-')[1]) % 100000, // Create numeric ID
      order_id: `#MNG-${orderId}`,
      status: 'pending',
      order_amount: orderAmount,
      delivery_charge: deliveryCharge,
      total_amount: totalAmount,
      payment_method: 'cod',
      payment_status: 'unpaid',
      order_type: 'delivery',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    customer: {
      id: 1,
      name: CUSTOMER.name,
      phone: `+91${CUSTOMER.phone}`,
      email: CUSTOMER.email,
    },
    vendor: {
      id: VENDOR.storeId,
      store_name: VENDOR.storeName,
      phone: VENDOR.storePhone,
      zone_wise_topic: `zone_${VENDOR.zoneId}_store`,
    },
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
    })),
    delivery_address: {
      address: 'Test Address, Nashik, Maharashtra 422001',
      latitude: 19.9975,
      longitude: 73.7898,
      contact_person_name: CUSTOMER.name,
      contact_person_number: `+91${CUSTOMER.phone}`,
    },
    timestamp: new Date().toISOString(),
  };
  
  log(`\nSending webhook to AI service...`, colors.cyan);
  
  const response = await axios.post(`${AI_SERVICE_URL}/api/webhook/order`, webhookPayload, {
    headers: {
      'x-webhook-secret': WEBHOOK_SECRET,
      'Content-Type': 'application/json',
    },
  });
  
  log(`✅ Order webhook processed: ${response.data.message}`, colors.green);
  
  return orderId;
}

async function simulateOrderStatusChange(orderId: string, status: string, previousStatus: string): Promise<void> {
  section(`5. ORDER STATUS: ${previousStatus.toUpperCase()} → ${status.toUpperCase()}`);
  
  log(`Updating order ${orderId} status...`, colors.cyan);
  
  const webhookPayload = {
    event: 'order.status_changed',
    order: {
      id: parseInt(orderId.split('-')[1]) % 100000,
      order_id: `#MNG-${orderId}`,
      status: status,
      previous_status: previousStatus,
      order_amount: 100,
      delivery_charge: 30,
      total_amount: 130,
      payment_method: 'cod',
      payment_status: status === 'delivered' ? 'paid' : 'unpaid',
      order_type: 'delivery',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    customer: {
      id: 1,
      name: CUSTOMER.name,
      phone: `+91${CUSTOMER.phone}`,
    },
    vendor: {
      id: VENDOR.storeId,
      store_name: VENDOR.storeName,
      phone: VENDOR.storePhone,
      zone_wise_topic: `zone_${VENDOR.zoneId}_store`,
    },
    items: [],
    timestamp: new Date().toISOString(),
  };
  
  const response = await axios.post(`${AI_SERVICE_URL}/api/webhook/order`, webhookPayload, {
    headers: {
      'x-webhook-secret': WEBHOOK_SECRET,
      'Content-Type': 'application/json',
    },
  });
  
  log(`✅ Status change processed: ${response.data.message}`, colors.green);
}

async function simulateDeliveryAssignment(orderId: string): Promise<void> {
  section('6. DELIVERY MAN ASSIGNED');
  
  log(`Assigning delivery man to order ${orderId}...`, colors.cyan);
  
  const webhookPayload = {
    event: 'order.assigned',
    order: {
      id: parseInt(orderId.split('-')[1]) % 100000,
      order_id: `#MNG-${orderId}`,
      status: 'picked_up',
      order_amount: 100,
      delivery_charge: 30,
      total_amount: 130,
      payment_method: 'cod',
      payment_status: 'unpaid',
      order_type: 'delivery',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    customer: {
      id: 1,
      name: CUSTOMER.name,
      phone: `+91${CUSTOMER.phone}`,
    },
    vendor: {
      id: VENDOR.storeId,
      store_name: VENDOR.storeName,
      phone: VENDOR.storePhone,
    },
    delivery_man: {
      id: 1,
      name: 'Ramesh Kumar',
      phone: '+919876543210',
    },
    items: [],
    timestamp: new Date().toISOString(),
  };
  
  const response = await axios.post(`${AI_SERVICE_URL}/api/webhook/order`, webhookPayload, {
    headers: {
      'x-webhook-secret': WEBHOOK_SECRET,
      'Content-Type': 'application/json',
    },
  });
  
  log(`✅ Delivery assignment processed: ${response.data.message}`, colors.green);
  log(`   Delivery Man: Ramesh Kumar (+919876543210)`, colors.blue);
}

async function testOrderTrackingNLU(): Promise<void> {
  section('7. TEST ORDER TRACKING NLU');
  
  const queries = [
    'mera order kahan hai',
    'delivery kab hogi',
    'track my order',
    'order status batao',
  ];
  
  for (const query of queries) {
    log(`\nTesting: "${query}"`, colors.cyan);
    
    const response = await axios.post(`${AI_SERVICE_URL}/api/nlu/classify`, {
      text: query,
    });
    
    const match = response.data.intent === 'track_order';
    const icon = match ? '✅' : '⚠️';
    const color = match ? colors.green : colors.yellow;
    
    log(`${icon} ${response.data.intent} (${response.data.confidence})`, color);
  }
}

async function testSearchForStoreItems(): Promise<void> {
  section('8. TEST SEARCH FOR STORE ITEMS');
  
  const searches = [
    { query: 'palak paneer', expected: 'Demo Restaurant item' },
    { query: 'pizza', expected: 'Demo Restaurant item' },
    { query: 'samosa', expected: 'Demo Restaurant item' },
    { query: 'dal', expected: 'Demo Restaurant item' },
  ];
  
  for (const search of searches) {
    log(`\nSearching: "${search.query}"`, colors.cyan);
    
    const response = await axios.get(`${AI_SERVICE_URL}/api/search/food`, {
      params: { q: search.query, limit: 3 }
    });
    
    const items = response.data.items || [];
    const demoRestaurantItem = items.find((i: any) => i.store_id === VENDOR.storeId);
    
    if (demoRestaurantItem) {
      log(`✅ Found in Demo Restaurant: ${demoRestaurantItem.name} (₹${demoRestaurantItem.price})`, colors.green);
    } else if (items.length > 0) {
      log(`ℹ️ Found in other stores: ${items[0].name} from ${items[0].store_name}`, colors.blue);
    } else {
      log(`⚠️ No items found`, colors.yellow);
    }
  }
}

// ========================================
// MAIN EXECUTION
// ========================================

async function main() {
  console.log(colors.bright + colors.magenta);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         REAL ORDER E2E TEST                                  ║');
  console.log('║         Vendor: Demo Restaurant (mangwale002@gmail.com)      ║');
  console.log('║         Customer: Dipali Bairagi (9067735173)                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  const startTime = Date.now();
  
  try {
    // 1. Vendor login
    const vendorToken = await testVendorLogin();
    
    // 2. Get store items
    const items = await getStoreItems();
    
    // 3. Test NLU for ordering
    await testNLUOrderIntent(`Demo restaurant se ${items[0]?.name || 'pizza'} mangwao`);
    
    // 4. Simulate order creation
    const orderId = await simulateOrderCreation(items);
    
    // 5. Simulate order lifecycle
    await simulateOrderStatusChange(orderId, 'confirmed', 'pending');
    await simulateOrderStatusChange(orderId, 'processing', 'confirmed');
    await simulateOrderStatusChange(orderId, 'handover', 'processing');
    
    // 6. Delivery assignment
    await simulateDeliveryAssignment(orderId);
    
    // 7. Complete delivery
    await simulateOrderStatusChange(orderId, 'delivered', 'picked_up');
    
    // 8. Test order tracking NLU
    await testOrderTrackingNLU();
    
    // 9. Test search for store items
    await testSearchForStoreItems();
    
    // Summary
    const totalTime = Date.now() - startTime;
    
    section('TEST SUMMARY');
    log(`✅ All tests completed successfully!`, colors.green);
    log(`   Total time: ${totalTime}ms`, colors.blue);
    log(`   Vendor: ${VENDOR.storeName} (${VENDOR.email})`, colors.blue);
    log(`   Customer: ${CUSTOMER.name} (${CUSTOMER.phone})`, colors.blue);
    log(`   Order ID: ${orderId}`, colors.blue);
    
    console.log(colors.bright + colors.green);
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('  COMPLETE ORDER JOURNEY TESTED SUCCESSFULLY');
    console.log('  pending → confirmed → processing → handover → picked_up → delivered');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(colors.reset);
    
  } catch (error: any) {
    section('ERROR');
    log(`❌ Test failed: ${error.message}`, colors.red);
    if (error.response?.data) {
      log(`   Response: ${JSON.stringify(error.response.data)}`, colors.red);
    }
    process.exit(1);
  }
}

main();
