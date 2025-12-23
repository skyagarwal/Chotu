#!/usr/bin/env ts-node
/**
 * 100 User Journey Tests
 * 
 * Comprehensive testing of various user scenarios and intents
 * across different languages, contexts, and use cases.
 */

import axios from 'axios';

const AI_SERVICE_URL = 'http://localhost:3200';
const PHP_BACKEND_URL = 'https://new.mangwale.com';

// Test credentials
const TEST_VENDOR_OWNER = {
  email: 'mangwale002@gmail.com',
  password: 'Mangwale@2025',
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
  id: number;
  query: string;
  expectedIntent: string;
  actualIntent: string;
  confidence: number;
  status: 'pass' | 'fail' | 'partial';
  duration: number;
}

const results: TestResult[] = [];

// ========================================
// 100 USER JOURNEY TEST CASES
// ========================================
const testCases = [
  // Food Ordering - Basic (1-10)
  { text: 'pizza order karo', expected: 'order_food' },
  { text: 'I want to order biryani', expected: 'order_food' },
  { text: 'mujhe khana chahiye', expected: 'order_food' },
  { text: 'burger mangwao', expected: 'order_food' },
  { text: 'dinner order karna hai', expected: 'order_food' },
  { text: 'lunch ke liye kuch mangwao', expected: 'order_food' },
  { text: 'breakfast mangwana hai', expected: 'order_food' },
  { text: 'chicken momos chahiye', expected: 'order_food' },
  { text: 'veg thali order karo', expected: 'order_food' },
  { text: 'chinese food mangwao', expected: 'order_food' },
  
  // Food Ordering - Specific Restaurant (11-20)
  { text: 'inayat cafe se biryani mangwao', expected: 'order_food' },
  { text: 'friendship restaurant se order karo', expected: 'order_food' },
  { text: 'green bakes se cake mangwao', expected: 'order_food' },
  { text: 'order from hotel raj darbar', expected: 'order_food' },
  { text: 'sk food parcel se khana chahiye', expected: 'order_food' },
  { text: 'demo restaurant se pizza', expected: 'order_food' },
  { text: 'garwa restaurant se dinner', expected: 'order_food' },
  { text: 'new rasoi se sabji', expected: 'order_food' },
  { text: 'order paneer from any restaurant', expected: 'order_food' },
  { text: 'koi bhi achha restaurant se biryani', expected: 'order_food' },
  
  // Food Ordering - With Preferences (21-30)
  { text: 'spicy biryani chahiye', expected: 'order_food' },
  { text: 'less spicy pizza please', expected: 'order_food' },
  { text: 'extra cheese burger', expected: 'order_food' },
  { text: 'no onion veg fried rice', expected: 'order_food' },
  { text: 'jain food mangwao', expected: 'order_food' },
  { text: 'halal chicken biryani', expected: 'order_food' },
  { text: 'pure veg restaurant se order', expected: 'order_food' },
  { text: 'gluten free options dikhao', expected: 'order_food' },
  { text: 'diabetic friendly food', expected: 'order_food' },
  { text: 'low calorie dinner options', expected: 'order_food' },
  
  // Search Products (31-40)
  { text: 'paneer ke options dikhao', expected: 'search_product' },
  { text: 'show me pizza varieties', expected: 'search_product' },
  { text: 'biryani prices check karo', expected: 'search_product' },
  { text: 'burger menu dikhao', expected: 'search_product' },
  { text: 'chinese items kya kya hai', expected: 'search_product' },
  { text: 'dessert options batao', expected: 'search_product' },
  { text: 'cold drinks konsi hai', expected: 'search_product' },
  { text: 'ice cream flavors', expected: 'search_product' },
  { text: 'snacks menu', expected: 'search_product' },
  { text: 'breakfast items dikhao', expected: 'search_product' },
  
  // Order Tracking (41-50)
  { text: 'mera order kahan hai', expected: 'track_order' },
  { text: 'order status batao', expected: 'track_order' },
  { text: 'track my order', expected: 'track_order' },
  { text: 'delivery kab hogi', expected: 'track_order' },
  { text: 'order ka status', expected: 'track_order' },
  { text: 'where is my food', expected: 'track_order' },
  { text: 'delivery boy kahan hai', expected: 'track_order' },
  { text: 'kitna time lagega', expected: 'track_order' },
  { text: 'order aaya kya', expected: 'track_order' },
  { text: 'delivery status check', expected: 'track_order' },
  
  // Cart Operations (51-60)
  { text: 'cart me add karo', expected: 'add_to_cart' },
  { text: 'add this to cart', expected: 'add_to_cart' },
  { text: 'cart me dal do', expected: 'add_to_cart' },
  { text: 'show my cart', expected: 'view_cart' },
  { text: 'cart dikhao', expected: 'view_cart' },
  { text: 'kya hai cart me', expected: 'view_cart' },
  { text: 'remove from cart', expected: 'remove_from_cart' },
  { text: 'cart se hatao', expected: 'remove_from_cart' },
  { text: 'clear cart', expected: 'clear_cart' },
  { text: 'empty my cart', expected: 'clear_cart' },
  
  // Checkout (61-65)
  { text: 'checkout karo', expected: 'checkout' },
  { text: 'place order', expected: 'checkout' },
  { text: 'order confirm karo', expected: 'checkout' },
  { text: 'pay karna hai', expected: 'checkout' },
  { text: 'proceed to payment', expected: 'checkout' },
  
  // Cancel Order (66-70)
  { text: 'order cancel karo', expected: 'cancel_order' },
  { text: 'cancel my order', expected: 'cancel_order' },
  { text: 'order nahi chahiye', expected: 'cancel_order' },
  { text: 'abort this order', expected: 'cancel_order' },
  { text: 'mujhe cancel karna hai order', expected: 'cancel_order' },
  
  // Repeat Order (71-75)
  { text: 'wahi order repeat karo', expected: 'repeat_order' },
  { text: 'same order again', expected: 'repeat_order' },
  { text: 'last order dobara', expected: 'repeat_order' },
  { text: 'reorder my last order', expected: 'repeat_order' },
  { text: 'pichla order phir se', expected: 'repeat_order' },
  
  // Parcel/Delivery Booking (76-85)
  { text: 'pickup my shoes from home', expected: 'parcel_booking' },
  { text: 'parcel bhejni hai', expected: 'parcel_booking' },
  { text: 'courier send karo', expected: 'parcel_booking' },
  { text: 'document pickup karwao', expected: 'parcel_booking' },
  { text: 'package deliver karo', expected: 'parcel_booking' },
  { text: 'ghar se office tak deliver', expected: 'parcel_booking' },
  { text: 'send a parcel to friend', expected: 'parcel_booking' },
  { text: 'book a delivery', expected: 'parcel_booking' },
  { text: 'pick something from my office', expected: 'parcel_booking' },
  { text: 'courier booking karo', expected: 'parcel_booking' },
  
  // Greetings (86-90)
  { text: 'hello', expected: 'greeting' },
  { text: 'hi', expected: 'greeting' },
  { text: 'namaste', expected: 'greeting' },
  { text: 'good morning', expected: 'greeting' },
  { text: 'hey there', expected: 'greeting' },
  
  // Help/Support (91-95)
  { text: 'help chahiye', expected: 'help' },
  { text: 'assistance please', expected: 'help' },
  { text: 'mujhe madad karo', expected: 'help' },
  { text: 'support se baat karo', expected: 'help' },
  { text: 'customer care number', expected: 'help' },
  
  // Budget/Recommendations (96-100)
  { text: '200 rs me kya milega', expected: 'order_food' },
  { text: 'best pizza in nashik', expected: 'order_food' },
  { text: 'recommend something for dinner', expected: 'order_food' },
  { text: 'party ke liye food suggest karo', expected: 'order_food' },
  { text: 'aaj kya special hai', expected: 'order_food' },
];

async function classifyIntent(text: string): Promise<{ intent: string; confidence: number }> {
  const start = Date.now();
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/nlu/classify`, { text });
    return {
      intent: response.data.intent,
      confidence: response.data.confidence,
    };
  } catch (error: any) {
    console.error(`Error classifying: ${text}`, error.message);
    return { intent: 'error', confidence: 0 };
  }
}

async function runTests() {
  console.log(colors.bright + colors.magenta);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         100 USER JOURNEY TESTS                               ║');
  console.log('║         Testing NLU classification accuracy                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;
  let partial = 0;
  
  // Run tests in batches to avoid overwhelming the server
  const batchSize = 5;
  
  for (let i = 0; i < testCases.length; i += batchSize) {
    const batch = testCases.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (testCase, batchIndex) => {
        const testIndex = i + batchIndex + 1;
        const start = Date.now();
        const result = await classifyIntent(testCase.text);
        const duration = Date.now() - start;
        
        const status: 'pass' | 'fail' | 'partial' = 
          result.intent === testCase.expected ? 'pass' :
          (result.intent.includes(testCase.expected) || testCase.expected.includes(result.intent)) ? 'partial' : 'fail';
        
        return {
          id: testIndex,
          query: testCase.text,
          expectedIntent: testCase.expected,
          actualIntent: result.intent,
          confidence: result.confidence,
          status,
          duration,
        };
      })
    );
    
    // Log results
    for (const result of batchResults) {
      if (result.status === 'pass') {
        console.log(colors.green + `✅ [${result.id}] "${result.query.substring(0, 35)}..."` + colors.reset);
        console.log(`   → ${result.actualIntent} (${result.confidence.toFixed(2)}) [${result.duration}ms]`);
        passed++;
      } else if (result.status === 'partial') {
        console.log(colors.yellow + `⚠️ [${result.id}] "${result.query.substring(0, 35)}..."` + colors.reset);
        console.log(`   → ${result.actualIntent} (expected: ${result.expectedIntent}) [${result.duration}ms]`);
        partial++;
      } else {
        console.log(colors.red + `❌ [${result.id}] "${result.query.substring(0, 35)}..."` + colors.reset);
        console.log(`   → ${result.actualIntent} (expected: ${result.expectedIntent}) [${result.duration}ms]`);
        failed++;
      }
      
      results.push(result);
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const totalTime = Date.now() - startTime;
  
  // Summary
  console.log(colors.bright + colors.magenta);
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(colors.green + `Passed: ${passed} (${((passed/results.length)*100).toFixed(1)}%)` + colors.reset);
  console.log(colors.yellow + `Partial: ${partial} (${((partial/results.length)*100).toFixed(1)}%)` + colors.reset);
  console.log(colors.red + `Failed: ${failed} (${((failed/results.length)*100).toFixed(1)}%)` + colors.reset);
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Avg Time per Test: ${(totalTime/results.length).toFixed(0)}ms`);
  
  // Group by intent for analysis
  console.log('\n📊 Results by Expected Intent:');
  const byIntent: { [key: string]: { pass: number; fail: number; partial: number } } = {};
  
  for (const result of results) {
    if (!byIntent[result.expectedIntent]) {
      byIntent[result.expectedIntent] = { pass: 0, fail: 0, partial: 0 };
    }
    byIntent[result.expectedIntent][result.status]++;
  }
  
  for (const [intent, counts] of Object.entries(byIntent)) {
    const total = counts.pass + counts.fail + counts.partial;
    const accuracy = ((counts.pass / total) * 100).toFixed(0);
    const color = counts.fail === 0 ? colors.green : counts.pass === 0 ? colors.red : colors.yellow;
    console.log(color + `  ${intent}: ${counts.pass}/${total} (${accuracy}% accuracy)` + colors.reset);
    if (counts.fail > 0) {
      const failedTests = results.filter(r => r.expectedIntent === intent && r.status === 'fail');
      failedTests.forEach(t => {
        console.log(`    - "${t.query}" → ${t.actualIntent}`);
      });
    }
  }
  
  // Return exit code
  process.exit(failed > 10 ? 1 : 0);
}

runTests();
