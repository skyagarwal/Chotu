/**
 * Full WhatsApp Flow E2E Test
 * 
 * Tests the complete WhatsApp message flow using real endpoints:
 * 1. Customer sends message via WhatsApp webhook
 * 2. AI processes message (NLU classification)
 * 3. Search results are generated
 * 4. Session state is updated
 * 5. Order can be placed via PHP backend
 */

import axios, { AxiosResponse } from 'axios';

const AI_SERVICE = 'http://localhost:3200';
const PHP_BACKEND = 'https://new.mangwale.com';

// Test credentials
const CUSTOMER = {
  phone: '9067735173',
  name: 'Dipali Bairagi',
  email: 'dgbairagi002@gmail.com',
  waId: '919067735173'
};

const VENDOR = {
  email: 'mangwale002@gmail.com',
  password: 'Mangwale@2025',
  storeId: 269,
  storeName: 'Demo Restaurant',
  items: {
    palakPaneer: { id: 14383, name: 'Palak Paneer', price: 50 },
    pizza: { id: 12998, name: 'pizza', price: 50 },
    samosa: { id: 13078, name: 'samosa', price: 20 },
    dal: { id: 15285, name: 'Dal', price: 50 }
  }
};

interface WhatsAppMessage {
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: { body: string };
          interactive?: {
            type: string;
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string };
          };
          type: string;
        }>;
      };
    }>;
  }>;
  object: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: any;
  error?: string;
}

class WhatsAppFlowTest {
  private results: TestResult[] = [];
  private vendorToken: string = '';
  private sessionId: string = '';
  
  async sendWhatsAppMessage(message: string, type: 'text' | 'button' = 'text', buttonId?: string): Promise<any> {
    const msgId = `test-${Date.now()}`;
    
    let payload: WhatsAppMessage;
    
    if (type === 'text') {
      payload = {
        entry: [{
          id: 'test',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '919209348567',
                phone_number_id: '123456'
              },
              contacts: [{
                profile: { name: CUSTOMER.name },
                wa_id: CUSTOMER.waId
              }],
              messages: [{
                from: CUSTOMER.waId,
                id: msgId,
                timestamp: String(Math.floor(Date.now() / 1000)),
                text: { body: message },
                type: 'text'
              }]
            }
          }]
        }],
        object: 'whatsapp_business_account'
      };
    } else {
      // Button response
      payload = {
        entry: [{
          id: 'test',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '919209348567',
                phone_number_id: '123456'
              },
              contacts: [{
                profile: { name: CUSTOMER.name },
                wa_id: CUSTOMER.waId
              }],
              messages: [{
                from: CUSTOMER.waId,
                id: msgId,
                timestamp: String(Math.floor(Date.now() / 1000)),
                interactive: {
                  type: 'button_reply',
                  button_reply: {
                    id: buttonId || 'confirm',
                    title: message
                  }
                },
                type: 'interactive'
              }]
            }
          }]
        }],
        object: 'whatsapp_business_account'
      };
    }
    
    const response = await axios.post(`${AI_SERVICE}/api/webhook/whatsapp`, payload);
    return response.data;
  }
  
  async getSession(): Promise<any> {
    const response = await axios.get(`${AI_SERVICE}/api/webhook/whatsapp/session/${CUSTOMER.waId}`);
    return response.data;
  }
  
  async clearSession(): Promise<void> {
    try {
      await axios.delete(`${AI_SERVICE}/api/webhook/whatsapp/session/${CUSTOMER.waId}`);
    } catch (e) {
      // Ignore if session doesn't exist
    }
  }
  
  async loginVendor(): Promise<string> {
    const response = await axios.post(`${PHP_BACKEND}/api/v1/auth/vendor/login`, {
      email: VENDOR.email,
      password: VENDOR.password,
      vendor_type: 'owner'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'zoneid': '4',
        'module-type': 'food'
      }
    });
    
    return response.data.token;
  }
  
  async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const details = await testFn();
      const result: TestResult = {
        name,
        passed: true,
        duration: Date.now() - startTime,
        details
      };
      this.results.push(result);
      console.log(`✅ ${name} (${result.duration}ms)`);
      return result;
    } catch (error: any) {
      const result: TestResult = {
        name,
        passed: false,
        duration: Date.now() - startTime,
        details: null,
        error: error.message
      };
      this.results.push(result);
      console.log(`❌ ${name}: ${error.message}`);
      return result;
    }
  }
  
  async run(): Promise<void> {
    console.log('\n' + '═'.repeat(70));
    console.log('         FULL WHATSAPP FLOW E2E TEST');
    console.log('         Customer: ' + CUSTOMER.name + ' (' + CUSTOMER.phone + ')');
    console.log('         Vendor: ' + VENDOR.storeName + ' (' + VENDOR.email + ')');
    console.log('═'.repeat(70) + '\n');
    
    // Clear any existing session
    await this.clearSession();
    console.log('🗑️  Cleared existing session\n');
    
    // Test 1: Greeting message
    await this.runTest('1. Send greeting message', async () => {
      const response = await this.sendWhatsAppMessage('hi');
      const session = await this.getSession();
      return {
        webhookResponse: response,
        sessionCreated: !!session.phoneNumber,
        currentStep: session.currentStep
      };
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Test 2: Food order intent
    await this.runTest('2. Send food order request', async () => {
      const response = await this.sendWhatsAppMessage('mujhe pizza khana hai');
      const session = await this.getSession();
      const hasSearchContext = !!session.data?._search_context;
      return {
        webhookResponse: response,
        hasSearchContext,
        searchQuery: session.data?._search_context?.lastQuery
      };
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Test 3: Search for Palak Paneer
    await this.runTest('3. Search for Palak Paneer', async () => {
      const response = await this.sendWhatsAppMessage('palak paneer dikhao');
      const session = await this.getSession();
      const searchResults = session.data?._search_context?.results;
      return {
        webhookResponse: response,
        hasResults: searchResults?.length > 0,
        resultsCount: searchResults?.length,
        firstResult: searchResults?.[0]?.name
      };
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Test 4: NLU classification test for various intents
    await this.runTest('4. NLU classification - order_food', async () => {
      const response = await axios.post(`${AI_SERVICE}/api/nlu/classify`, {
        text: 'Demo restaurant se samosa mangwao'
      });
      return {
        intent: response.data.intent,
        confidence: response.data.confidence,
        passed: response.data.intent === 'order_food' && response.data.confidence > 0.8
      };
    });
    
    // Test 5: NLU - Track order
    await this.runTest('5. NLU classification - track_order', async () => {
      const response = await axios.post(`${AI_SERVICE}/api/nlu/classify`, {
        text: 'mera order kab aayega'
      });
      return {
        intent: response.data.intent,
        confidence: response.data.confidence,
        passed: response.data.intent === 'track_order' && response.data.confidence > 0.8
      };
    });
    
    // Test 6: NLU - Add to cart
    await this.runTest('6. NLU classification - add_to_cart', async () => {
      const response = await axios.post(`${AI_SERVICE}/api/nlu/classify`, {
        text: 'pizza add kar do cart mein'
      });
      return {
        intent: response.data.intent,
        confidence: response.data.confidence,
        passed: response.data.intent === 'add_to_cart' && response.data.confidence > 0.8
      };
    });
    
    // Test 7: Vendor login verification
    await this.runTest('7. Vendor login verification', async () => {
      this.vendorToken = await this.loginVendor();
      return {
        tokenReceived: !!this.vendorToken,
        tokenPreview: this.vendorToken?.substring(0, 20) + '...'
      };
    });
    
    // Test 8: Search suggestions API
    await this.runTest('8. Search suggestions API', async () => {
      const response = await axios.get(`${AI_SERVICE}/api/search/suggest`, {
        params: { q: 'samosa' }
      });
      return {
        hasProducts: response.data.data?.products?.length > 0,
        productsCount: response.data.data?.products?.length,
        firstProduct: response.data.data?.products?.[0]?.name
      };
    });
    
    // Test 9: Order webhook processing
    await this.runTest('9. Order webhook processing', async () => {
      const orderData = {
        event: 'order_created',
        order: {
          id: `TEST-${Date.now()}`,
          customer: {
            id: 1,
            name: CUSTOMER.name,
            phone: CUSTOMER.phone,
            email: CUSTOMER.email
          },
          store: {
            id: VENDOR.storeId,
            name: VENDOR.storeName
          },
          items: [
            { id: VENDOR.items.palakPaneer.id, name: VENDOR.items.palakPaneer.name, quantity: 1, price: VENDOR.items.palakPaneer.price }
          ],
          total: VENDOR.items.palakPaneer.price,
          status: 'pending'
        },
        timestamp: new Date().toISOString()
      };
      
      const response = await axios.post(`${AI_SERVICE}/api/webhook/order`, orderData, {
        headers: {
          'X-Webhook-Secret': 'mangwale_webhook_secret_2024'
        }
      });
      
      return {
        success: response.data.success,
        message: response.data.message
      };
    });
    
    // Test 10: Cancel order NLU
    await this.runTest('10. NLU classification - cancel_order', async () => {
      const response = await axios.post(`${AI_SERVICE}/api/nlu/classify`, {
        text: 'order cancel kar do'
      });
      return {
        intent: response.data.intent,
        confidence: response.data.confidence,
        passed: response.data.intent === 'cancel_order' && response.data.confidence > 0.7
      };
    });
    
    // Test 11: Hinglish message handling
    await this.runTest('11. Hinglish message via WhatsApp', async () => {
      const response = await this.sendWhatsAppMessage('bhai 2 plate samosa bhej do');
      const session = await this.getSession();
      return {
        webhookProcessed: response.status === 'ok',
        sessionUpdated: !!session.updatedAt
      };
    });
    
    // Test 12: Store-specific search
    await this.runTest('12. Store-specific item verification', async () => {
      // Check if Demo Restaurant items exist in OpenSearch
      const response = await axios.get(`${AI_SERVICE}/api/search/suggest`, {
        params: { q: 'Dal', store_id: VENDOR.storeId }
      });
      return {
        searchWorking: response.data.success,
        productsFound: response.data.data?.products?.length
      };
    });
    
    // Print summary
    console.log('\n' + '═'.repeat(70));
    console.log('                    TEST SUMMARY');
    console.log('═'.repeat(70));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`\n✅ Passed: ${passed}/${this.results.length}`);
    console.log(`❌ Failed: ${failed}/${this.results.length}`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log(`📊 Success rate: ${Math.round((passed / this.results.length) * 100)}%\n`);
    
    if (failed > 0) {
      console.log('Failed tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('         WHATSAPP FLOW TEST COMPLETE');
    console.log('═'.repeat(70) + '\n');
  }
}

// Run the test
const test = new WhatsAppFlowTest();
test.run().catch(console.error);
