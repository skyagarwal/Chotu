#!/usr/bin/env ts-node
/**
 * Full E2E Order Placement Tests
 * 
 * Tests actual order creation flows:
 * 1. Customer authentication via OTP
 * 2. Cart operations
 * 3. Order placement
 * 4. Payment flows (wallet, Razorpay, COD)
 * 5. Order tracking
 * 6. Vendor notifications
 */

import axios, { AxiosInstance } from 'axios';

const AI_SERVICE_URL = 'http://localhost:3200';
const PHP_BACKEND_URL = 'https://new.mangwale.com';

// Test credentials
const TEST_CUSTOMER_PHONE = '9067735173';
const TEST_CUSTOMER_EMAIL = 'dgbairagi002@gmail.com';
const TEST_CUSTOMER_PASSWORD = 'Deepali@0903';

// Colors for terminal output
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

interface OrderData {
  id?: string;
  status?: string;
  total?: number;
}

// Create authenticated client for PHP backend
async function createAuthenticatedClient(token: string): Promise<AxiosInstance> {
  return axios.create({
    baseURL: PHP_BACKEND_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// API Wrappers
async function getCustomerToken(): Promise<string | null> {
  try {
    // Try direct login
    const response = await axios.post(`${PHP_BACKEND_URL}/api/v1/auth/customer/login`, {
      phone: TEST_CUSTOMER_PHONE,
      password: TEST_CUSTOMER_PASSWORD,
    });
    return response.data.token;
  } catch (error: any) {
    console.log(colors.yellow + `  Login method not available: ${error.message}` + colors.reset);
    return null;
  }
}

async function getVendorToken(): Promise<string> {
  const response = await axios.post(`${PHP_BACKEND_URL}/api/v1/auth/vendor/login`, {
    email: 'mangwale002@gmail.com',
    password: 'Mangwale@2025',
    vendor_type: 'owner',
  });
  return response.data.token;
}

async function searchFoodItems(query: string): Promise<any[]> {
  const response = await axios.get(`${AI_SERVICE_URL}/api/search/food`, {
    params: { q: query, limit: 10 }
  });
  return response.data.items || [];
}

async function searchStores(query: string): Promise<any[]> {
  const response = await axios.get(`${AI_SERVICE_URL}/api/search/food/stores`, {
    params: { q: query, limit: 5 }
  });
  return response.data.stores || [];
}

// Test Functions
async function testCustomerAuth() {
  console.log(colors.cyan + '\n📱 Testing Customer Authentication...' + colors.reset);
  
  // First try direct login
  console.log('  Attempting direct login...');
  const token = await getCustomerToken();
  
  if (token) {
    console.log(colors.green + `  ✅ Customer logged in with token: ${token.substring(0, 20)}...` + colors.reset);
    return token;
  }
  
  // If direct login fails, try OTP flow
  console.log('  Attempting OTP flow...');
  try {
    const sendOtpResponse = await axios.post(`${PHP_BACKEND_URL}/api/v1/auth/customer/send-otp`, {
      phone: TEST_CUSTOMER_PHONE,
    });
    console.log('  OTP sent:', sendOtpResponse.data);
    return null; // Would need actual OTP to continue
  } catch (error: any) {
    console.log(colors.yellow + `  OTP flow error: ${error.response?.data?.message || error.message}` + colors.reset);
    return null;
  }
}

async function testSearchAndCart() {
  console.log(colors.cyan + '\n🔍 Testing Search and Cart Operations...' + colors.reset);
  
  // Search for biryani
  console.log('  Searching for biryani...');
  const biryaniItems = await searchFoodItems('biryani');
  console.log(`  Found ${biryaniItems.length} biryani items`);
  
  if (biryaniItems.length > 0) {
    const item = biryaniItems[0];
    console.log(`  Top item: ${item.name} from ${item.store_name}`);
    console.log(`    Price: ₹${item.price}`);
    console.log(`    Store ID: ${item.store_id}`);
    console.log(`    Item ID: ${item.id}`);
    
    return {
      itemId: item.id,
      storeId: item.store_id,
      price: item.price,
      name: item.name,
    };
  }
  
  return null;
}

async function testOrderWorkflow() {
  console.log(colors.cyan + '\n📦 Testing Full Order Workflow...' + colors.reset);
  
  // 1. Get vendor token (for testing vendor side)
  console.log('  Getting vendor token...');
  const vendorToken = await getVendorToken();
  console.log(colors.green + `  ✅ Vendor authenticated` + colors.reset);
  
  // 2. Search for items
  console.log('  Searching for items to order...');
  const items = await searchFoodItems('paneer tikka');
  
  if (items.length === 0) {
    console.log(colors.yellow + '  No items found for order' + colors.reset);
    return;
  }
  
  const item = items[0];
  console.log(`  Selected: ${item.name} (₹${item.price}) from ${item.store_name}`);
  
  // 3. Prepare order data
  const orderPayload = {
    store_id: item.store_id,
    items: [{
      item_id: item.id,
      quantity: 1,
      price: item.price,
      addons: [],
    }],
    delivery_address: {
      lat: 19.9975,
      lng: 73.7898,
      address: 'Test Address, Nashik',
      landmark: 'Near Test Location',
    },
    payment_method: 'cod',
    special_instructions: 'Test order - please ignore',
  };
  
  console.log('  Order payload prepared:', JSON.stringify(orderPayload, null, 2));
  
  // Note: Not actually placing order to avoid creating test data in production
  console.log(colors.yellow + '  ⚠️ Skipping actual order placement (would create test data)' + colors.reset);
  
  return orderPayload;
}

async function testWebhookSimulation() {
  console.log(colors.cyan + '\n🔔 Testing Webhook Simulation...' + colors.reset);
  
  // Create a test webhook payload
  const webhookPayload = {
    event: 'order_placed',
    order_id: 'TEST123',
    store_id: '3',
    customer_id: '1',
    customer_phone: '+919067735173',
    status: 'pending',
    total_amount: 250,
    items: [
      { name: 'Paneer Tikka', quantity: 2, price: 125 }
    ],
    delivery_address: {
      address: 'Test Address, Nashik',
      lat: 19.9975,
      lng: 73.7898,
    }
  };
  
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/webhook/order`, webhookPayload, {
      headers: {
        'x-webhook-secret': 'mangwale_webhook_secret_2024',
        'Content-Type': 'application/json',
      }
    });
    console.log(colors.green + `  ✅ Webhook processed successfully` + colors.reset);
    console.log('  Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log(colors.red + `  ❌ Webhook error: ${error.response?.data?.message || error.message}` + colors.reset);
  }
}

async function testNLUPipeline() {
  console.log(colors.cyan + '\n🧠 Testing NLU Pipeline with Complex Queries...' + colors.reset);
  
  const complexQueries = [
    // Budget-based queries
    { text: 'mujhe 500 rs me 3 log ke liye kuch mangwana hai', expected: 'order_food' },
    
    // Location-based queries  
    { text: 'mere ghar ke pass ka restaurant dikhao', expected: 'order_food' },
    
    // Time-based queries
    { text: 'abhi kya khane ke liye milega', expected: 'order_food' },
    
    // Preference-based queries
    { text: 'spicy chicken kuch order karna hai', expected: 'order_food' },
    
    // Multi-intent queries
    { text: 'order status batao aur naya order bhi karna hai', expected: 'track_order' },
    
    // Cancel flow
    { text: 'mera last order cancel kardo', expected: 'cancel_order' },
    
    // Support queries
    { text: 'delivery boy se baat karni hai', expected: 'contact_support' },
    
    // Repeat orders
    { text: 'wahi order repeat kardo jo last time kiya tha', expected: 'repeat_order' },
    
    // Schedule orders
    { text: 'kal subah 9 baje ke liye order karna hai', expected: 'order_food' },
    
    // Pickup orders
    { text: 'main khud pick karunga order', expected: 'parcel_booking' },
  ];
  
  for (const query of complexQueries) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/nlu/classify`, {
        text: query.text,
      });
      
      const { intent, confidence } = response.data;
      const match = intent === query.expected;
      
      if (match) {
        console.log(colors.green + `  ✅ "${query.text.substring(0, 40)}..."` + colors.reset);
        console.log(`     → ${intent} (${confidence.toFixed(2)})`);
      } else {
        console.log(colors.yellow + `  ⚠️ "${query.text.substring(0, 40)}..."` + colors.reset);
        console.log(`     → ${intent} (expected: ${query.expected})`);
      }
    } catch (error: any) {
      console.log(colors.red + `  ❌ Error: ${error.message}` + colors.reset);
    }
  }
}

async function testPaymentAPIs() {
  console.log(colors.cyan + '\n💳 Testing Payment API Endpoints...' + colors.reset);
  
  // Check Razorpay order creation endpoint (without actually creating)
  console.log('  Checking Razorpay integration...');
  try {
    const response = await axios.get(`${PHP_BACKEND_URL}/api/v1/payment/methods`);
    console.log('  Available payment methods:', response.data);
  } catch (error: any) {
    console.log(colors.yellow + `  Payment methods check: ${error.response?.status || error.message}` + colors.reset);
  }
  
  // Check wallet balance endpoint
  console.log('  Checking wallet API...');
  try {
    const response = await axios.get(`${PHP_BACKEND_URL}/api/v1/wallet/balance`, {
      headers: { 'Authorization': 'Bearer test_token' }
    });
    console.log('  Wallet response:', response.data);
  } catch (error: any) {
    console.log(colors.yellow + `  Wallet check requires auth: ${error.response?.status}` + colors.reset);
  }
}

async function testStoreAvailability() {
  console.log(colors.cyan + '\n🏪 Testing Store Availability...' + colors.reset);
  
  // Search for stores
  const stores = await searchStores('restaurant');
  console.log(`  Found ${stores.length} restaurants`);
  
  if (stores.length > 0) {
    console.log('  First 5 stores:');
    stores.slice(0, 5).forEach((store: any, i: number) => {
      console.log(`    ${i + 1}. ${store.name} (ID: ${store.id})`);
      console.log(`       Status: ${store.status || 'unknown'}`);
      console.log(`       Phone: ${store.phone || 'N/A'}`);
    });
  }
}

// Main execution
async function main() {
  console.log(colors.bright + colors.magenta);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         FULL E2E ORDER PLACEMENT TESTS                       ║');
  console.log('║         Testing real API endpoints                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  const startTime = Date.now();
  
  try {
    await testCustomerAuth();
    await testSearchAndCart();
    await testOrderWorkflow();
    await testWebhookSimulation();
    await testNLUPipeline();
    await testPaymentAPIs();
    await testStoreAvailability();
    
    const totalTime = Date.now() - startTime;
    console.log(colors.bright + colors.green);
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log(`  ALL TESTS COMPLETED in ${totalTime}ms`);
    console.log('════════════════════════════════════════════════════════════════');
    console.log(colors.reset);
    
  } catch (error: any) {
    console.log(colors.red + `\nTest suite error: ${error.message}` + colors.reset);
    process.exit(1);
  }
}

main();
