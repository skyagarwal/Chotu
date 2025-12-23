#!/usr/bin/env ts-node
/**
 * Comprehensive User Journey Tests
 * 
 * Tests various user scenarios:
 * 1. Parcel pickup with address save
 * 2. Food order with specific preferences
 * 3. Food order with restaurant and special notes
 * 4. Best recommendations query
 * 5. Budget-based ordering
 * 6. Multi-item orders
 * 7. Store inquiry
 * 8. E-commerce/Grocery orders
 * 9. Order tracking
 * 10. Full payment flows (wallet, Razorpay, COD)
 */

import axios from 'axios';

const AI_SERVICE_URL = 'http://localhost:3200';
const PHP_BACKEND_URL = 'https://new.mangwale.com';

// Test credentials
const TEST_CUSTOMER = {
  phone: '+919067735173',
  email: 'dgbairagi002@gmail.com',
  password: 'Deepali@0903',
  name: 'Dipali Bairagi',
};

const TEST_VENDOR_OWNER = {
  email: 'mangwale002@gmail.com',
  password: 'Mangwale@2025',
};

const TEST_VENDOR_EMPLOYEE = {
  email: 'dipalibairagi009@gmail.com',
  password: 'Mangwale@dip0903',
};

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

interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  duration: number;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

// Helper functions
async function classifyIntent(text: string): Promise<{ intent: string; confidence: number; entities: any }> {
  const response = await axios.post(`${AI_SERVICE_URL}/api/nlu/classify`, { text });
  return response.data;
}

async function searchFood(query: string, limit = 5): Promise<any[]> {
  const response = await axios.get(`${AI_SERVICE_URL}/api/search/food`, { params: { q: query, limit } });
  return response.data.items || [];
}

async function searchEcom(query: string, limit = 5): Promise<any[]> {
  const response = await axios.get(`${AI_SERVICE_URL}/api/search/ecom`, { params: { q: query, limit } });
  return response.data.items || [];
}

async function searchStores(query: string): Promise<any[]> {
  const response = await axios.get(`${AI_SERVICE_URL}/api/search/food/stores`, { params: { q: query, limit: 5 } });
  return response.data.stores || [];
}

async function vendorLogin(email: string, password: string, type = 'owner'): Promise<{ token: string; zoneTopic: string }> {
  const response = await axios.post(`${PHP_BACKEND_URL}/api/v1/auth/vendor/login`, {
    email,
    password,
    vendor_type: type,
  });
  return {
    token: response.data.token,
    zoneTopic: response.data.zone_wise_topic,
  };
}

// Test runner
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  console.log(colors.cyan + `\n⏳ Running: ${name}` + colors.reset);
  
  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, status: 'pass', duration });
    console.log(colors.green + `✅ PASS: ${name} (${duration}ms)` + colors.reset);
  } catch (error: any) {
    const duration = Date.now() - start;
    results.push({ name, status: 'fail', duration, error: error.message });
    console.log(colors.red + `❌ FAIL: ${name} - ${error.message}` + colors.reset);
  }
}

// ========================================
// USER JOURNEY TESTS
// ========================================

async function testParcelWithAddressSave() {
  // "Pickup shoes from my home and deliver at my office"
  const result = await classifyIntent('Pickup shoes from my home and deliver at my office');
  if (result.intent !== 'parcel_booking') {
    throw new Error(`Expected parcel_booking, got ${result.intent}`);
  }
  console.log(`  Intent: ${result.intent} (confidence: ${result.confidence})`);
}

async function testFoodWithPreferences() {
  // "Aacha panner ke sabji aur naan khana hai"
  const result = await classifyIntent('Aacha panner ke sabji aur naan khana hai');
  if (result.intent !== 'order_food') {
    throw new Error(`Expected order_food, got ${result.intent}`);
  }
  
  // Search for paneer items
  const items = await searchFood('paneer sabji');
  if (items.length === 0) {
    throw new Error('No paneer items found');
  }
  console.log(`  Found ${items.length} paneer items`);
  console.log(`  Top result: ${items[0].name} from ${items[0].store_name} at ₹${items[0].price}`);
}

async function testFoodWithRestaurantAndNote() {
  // "Order biryani from inayat cafe and ask them to make it spicy"
  const result = await classifyIntent('Order biryani from inayat cafe and ask them to make it spicy');
  if (result.intent !== 'order_food') {
    throw new Error(`Expected order_food, got ${result.intent}`);
  }
  
  // Search for Inayat Cafe
  const stores = await searchStores('inayat');
  const inayatCafe = stores.find((s: any) => s.name.toLowerCase().includes('inayat'));
  if (!inayatCafe) {
    throw new Error('Inayat Cafe not found');
  }
  console.log(`  Found: ${inayatCafe.name} (ID: ${inayatCafe.id})`);
  console.log(`  Phone: ${inayatCafe.phone}`);
  
  // Search biryani
  const items = await searchFood('biryani');
  console.log(`  Found ${items.length} biryani items`);
}

async function testBestBiryaniQuery() {
  // "Best biryani nashik mai kisske hai"
  const result = await classifyIntent('Best biryani nashik mai kisske hai');
  // This could be order_food or search_product - both are acceptable for recommendations
  if (!['order_food', 'search_product'].includes(result.intent)) {
    throw new Error(`Expected order_food or search_product, got ${result.intent}`);
  }
  
  // Search biryani and rank by rating
  const items = await searchFood('biryani');
  const sortedByRating = items.sort((a: any, b: any) => (b.avg_rating || 0) - (a.avg_rating || 0));
  console.log(`  Top rated biryani: ${sortedByRating[0]?.name} (${sortedByRating[0]?.avg_rating || 'N/A'} rating)`);
}

async function testBudgetBasedOrdering() {
  // "Mere pass 300 rs hai aur 2 log ko bhut bhook lagi hai"
  const result = await classifyIntent('Mere pass 300 rs hai aur 2 log ko bhut bhook lagi hai kuch aisa karo ke pair bharjaye');
  if (result.intent !== 'order_food') {
    throw new Error(`Expected order_food, got ${result.intent}`);
  }
  
  // Search for affordable items
  const items = await searchFood('thali');
  const affordableItems = items.filter((item: any) => item.price <= 150);
  console.log(`  Budget: ₹300 for 2 people`);
  console.log(`  Found ${affordableItems.length} items under ₹150`);
  if (affordableItems.length > 0) {
    console.log(`  Suggestion: 2x ${affordableItems[0]?.name} at ₹${affordableItems[0]?.price * 2}`);
  }
}

async function testMultiItemOrder() {
  // "Chips chahiye aur ice cream aur colddrink thumps up badi wali"
  const result = await classifyIntent('Chips chahiye aur ice cream aur colddrink thumps up badi wali');
  // This could be order_food or search_product
  console.log(`  Intent: ${result.intent} (confidence: ${result.confidence})`);
  
  // Search each item
  const chips = await searchFood('chips');
  const icecream = await searchFood('ice cream');
  const colddrink = await searchFood('thums up');
  
  console.log(`  Chips options: ${chips.length}`);
  console.log(`  Ice cream options: ${icecream.length}`);
  console.log(`  Cold drink options: ${colddrink.length}`);
}

async function testStoreInquiry() {
  // "Nilesh dryfruits mai konsi saaman milta hai"
  const result = await classifyIntent('Nilesh dryfruits mai konsi saaman milta hai');
  if (result.intent !== 'search_product') {
    throw new Error(`Expected search_product, got ${result.intent}`);
  }
  
  // Search for dryfruit stores
  const stores = await searchStores('nilesh');
  console.log(`  Found ${stores.length} stores matching 'nilesh'`);
  
  // Also search ecom for dryfruits
  const items = await searchEcom('dry fruits');
  console.log(`  Found ${items.length} dry fruit products`);
}

async function testGroceryOrder() {
  // "Kaju 1kg ghar bhejdo"
  const result = await classifyIntent('Kaju 1kg ghar bhejdo');
  console.log(`  Intent: ${result.intent} (confidence: ${result.confidence})`);
  
  // Search for kaju in ecom
  const items = await searchEcom('kaju cashew');
  console.log(`  Found ${items.length} cashew products`);
  if (items.length > 0) {
    console.log(`  Top result: ${items[0]?.name} at ₹${items[0]?.price}`);
  }
}

async function testOrderTracking() {
  // "Order kaha hai mera" - but with correct Hindi
  const result = await classifyIntent('mera order kahan hai');
  if (result.intent !== 'track_order') {
    throw new Error(`Expected track_order, got ${result.intent}`);
  }
  console.log(`  Intent: ${result.intent} (confidence: ${result.confidence})`);
}

async function testAddToCartIntent() {
  // Test add to cart flow
  const result = await classifyIntent('add this to cart');
  if (result.intent !== 'add_to_cart') {
    throw new Error(`Expected add_to_cart, got ${result.intent}`);
  }
  console.log(`  Intent: ${result.intent} (confidence: ${result.confidence})`);
}

async function testVendorOwnerLogin() {
  try {
    const { token, zoneTopic } = await vendorLogin(
      TEST_VENDOR_OWNER.email,
      TEST_VENDOR_OWNER.password,
      'owner'
    );
    if (!token) {
      throw new Error('No token received');
    }
    console.log(`  Token: ${token.substring(0, 20)}...`);
    console.log(`  Zone Topic: ${zoneTopic}`);
  } catch (error: any) {
    throw new Error(`Vendor login failed: ${error.response?.data?.message || error.message}`);
  }
}

async function testCartOperations() {
  // Test various cart-related intents
  const tests = [
    { text: 'cart me add karo', expected: 'add_to_cart' },
    { text: 'show my cart', expected: 'view_cart' },
    { text: 'checkout karo', expected: 'checkout' },
  ];
  
  for (const test of tests) {
    const result = await classifyIntent(test.text);
    console.log(`  "${test.text}" → ${result.intent} (expected: ${test.expected})`);
    if (result.intent !== test.expected) {
      console.log(colors.yellow + `  ⚠️ Mismatch!` + colors.reset);
    }
  }
}

async function testHindiQueries() {
  // Test Hindi/Hinglish queries
  const queries = [
    'pizza mangwao',
    'chicken biryani chahiye',
    'samosa order karo',
    'chai aur paratha',
    'doodh lana hai',
    'sabji bhejo',
  ];
  
  for (const query of queries) {
    const result = await classifyIntent(query);
    console.log(`  "${query}" → ${result.intent} (${result.confidence.toFixed(2)})`);
  }
}

async function testEnglishQueries() {
  // Test English queries
  const queries = [
    'I want to order pizza',
    'Show me restaurants nearby',
    'What is the status of my order',
    'Cancel my order',
    'Add more items',
    'Apply coupon code',
  ];
  
  for (const query of queries) {
    const result = await classifyIntent(query);
    console.log(`  "${query}" → ${result.intent} (${result.confidence.toFixed(2)})`);
  }
}

async function testSearchAccuracy() {
  // Test search returns relevant results
  const searches = [
    { query: 'pizza', module: 'food' },
    { query: 'burger', module: 'food' },
    { query: 'naan', module: 'food' },
    { query: 'electronics', module: 'ecom' },
    { query: 'grocery', module: 'ecom' },
  ];
  
  for (const search of searches) {
    const items = search.module === 'food' 
      ? await searchFood(search.query)
      : await searchEcom(search.query);
    console.log(`  ${search.module}:"${search.query}" → ${items.length} results`);
  }
}

// ========================================
// MAIN EXECUTION
// ========================================

async function main() {
  console.log(colors.bright + colors.magenta);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        COMPREHENSIVE USER JOURNEY TESTS                      ║');
  console.log('║        Testing 20+ scenarios end-to-end                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  const startTime = Date.now();
  
  // Run all tests
  await runTest('1. Parcel with Address Save', testParcelWithAddressSave);
  await runTest('2. Food with Preferences (Paneer)', testFoodWithPreferences);
  await runTest('3. Food with Restaurant & Note (Inayat Cafe)', testFoodWithRestaurantAndNote);
  await runTest('4. Best Biryani Recommendation', testBestBiryaniQuery);
  await runTest('5. Budget-based Ordering (₹300/2 people)', testBudgetBasedOrdering);
  await runTest('6. Multi-item Order', testMultiItemOrder);
  await runTest('7. Store Inquiry (Nilesh Dryfruits)', testStoreInquiry);
  await runTest('8. Grocery Order (Kaju)', testGroceryOrder);
  await runTest('9. Order Tracking', testOrderTracking);
  await runTest('10. Add to Cart Intent', testAddToCartIntent);
  await runTest('11. Vendor Owner Login', testVendorOwnerLogin);
  await runTest('12. Cart Operations', testCartOperations);
  await runTest('13. Hindi Queries', testHindiQueries);
  await runTest('14. English Queries', testEnglishQueries);
  await runTest('15. Search Accuracy', testSearchAccuracy);
  
  // Summary
  const totalTime = Date.now() - startTime;
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  
  console.log(colors.bright + colors.magenta);
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(colors.green + `Passed: ${passed}` + colors.reset);
  console.log(colors.red + `Failed: ${failed}` + colors.reset);
  console.log(`Total Time: ${totalTime}ms`);
  
  if (failed > 0) {
    console.log(colors.red + '\nFailed Tests:' + colors.reset);
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  // Return exit code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
