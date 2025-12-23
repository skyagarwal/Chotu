const { io } = require('socket.io-client');

const WS_URL = 'http://localhost:3200/ai-agent';
const SESSION_ID = 'full-test-' + Date.now();
const TEST_PHONE = '9158886329';  // Real test number for registration

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runFullJourney() {
  console.log('\n========================================');
  console.log('   FULL REGISTRATION + PARCEL JOURNEY');
  console.log('========================================');
  console.log('Session:', SESSION_ID);
  console.log('Phone:', TEST_PHONE, '\n');
  
  const socket = io(WS_URL, { transports: ['websocket'] });
  let messages = [];
  let step = 0;
  
  function sendMessage(msg) {
    step++;
    console.log(`\n--- STEP ${step} ---`);
    console.log('[USER]', msg);
    messages = [];
    socket.emit('message:send', {
      sessionId: SESSION_ID,
      message: msg,
      platform: 'web',
      type: 'text'
    });
  }
  
  function sendLocation(lat, lng, label) {
    step++;
    console.log(`\n--- STEP ${step} ---`);
    console.log('[USER] 📍', label, `(${lat}, ${lng})`);
    messages = [];
    socket.emit('message:send', {
      sessionId: SESSION_ID,
      message: '__LOCATION__',
      platform: 'web',
      type: 'location',
      location: { latitude: lat, longitude: lng }
    });
  }
  
  function getLastContent() {
    if (messages.length === 0) return '';
    const m = messages[messages.length - 1];
    return (m.content || m.text || '').toLowerCase();
  }
  
  function printResponse() {
    const content = messages.length > 0 ? (messages[messages.length - 1].content || messages[messages.length - 1].text || '') : '(no response)';
    console.log('[BOT]', content.substring(0, 300));
    if (messages.length > 0 && messages[messages.length - 1].buttons) {
      console.log('     Buttons:', messages[messages.length - 1].buttons.map(b => b.label).join(', '));
    }
    return content.toLowerCase();
  }
  
  socket.on('connect', async () => {
    console.log('[OK] Connected to WebSocket\n');
    socket.emit('session:join', { sessionId: SESSION_ID, platform: 'web' });
    await sleep(1000);
    
    // ============================================
    // PHASE 1: REGISTRATION FLOW
    // ============================================
    console.log('\n============ PHASE 1: REGISTRATION ============\n');
    
    // 1. Start parcel booking
    sendMessage('I want to send a parcel');
    await sleep(3000);
    let resp = printResponse();
    
    // 2. Enter phone number
    sendMessage(TEST_PHONE);
    await sleep(3000);
    resp = printResponse();
    
    // 3. Enter OTP (will get real OTP or use mock)
    // For now use 123456 as mock
    sendMessage('123456');
    await sleep(4000);
    resp = printResponse();
    
    // Check if we need to register (new user)
    if (resp.includes('name') || resp.includes('profile') || resp.includes('address')) {
      console.log('\n[INFO] New user - completing registration...');
      
      // Provide name if asked
      if (resp.includes('name')) {
        sendMessage('Akshay Agarwal');
        await sleep(3000);
        resp = printResponse();
      }
    }
    
    // ============================================
    // PHASE 2: PARCEL BOOKING FLOW  
    // ============================================
    console.log('\n============ PHASE 2: PARCEL BOOKING ============\n');
    
    // Check current state
    if (resp.includes('pickup') || resp.includes('location')) {
      // 4. Pickup location
      sendLocation(19.9975, 73.7898, 'Pickup: Nashik Main');
      await sleep(4000);
      resp = printResponse();
    }
    
    // 5. Delivery location
    if (resp.includes('delivery') || resp.includes('location')) {
      sendLocation(20.0063, 73.7606, 'Delivery: CB Nagar');
      await sleep(4000);
      resp = printResponse();
    }
    
    // 6. Recipient details
    if (resp.includes('recipient') || resp.includes('name') || resp.includes('phone')) {
      sendMessage('Rahul Sharma, 9876543210');
      await sleep(4000);
      resp = printResponse();
    }
    
    // 7. Parcel category/type
    if (resp.includes('category') || resp.includes('type') || resp.includes('what') || resp.includes('sending')) {
      sendMessage('Documents');
      await sleep(4000);
      resp = printResponse();
    }
    
    // 8. Parcel weight
    if (resp.includes('weight') || resp.includes('how heavy') || resp.includes('kg')) {
      sendMessage('500 grams');
      await sleep(4000);
      resp = printResponse();
    }
    
    // 9. Price confirmation
    if (resp.includes('₹') || resp.includes('price') || resp.includes('cost') || resp.includes('confirm')) {
      sendMessage('yes confirm');
      await sleep(4000);
      resp = printResponse();
    }
    
    // 10. Payment method
    if (resp.includes('payment') || resp.includes('pay') || resp.includes('cash') || resp.includes('online')) {
      sendMessage('Cash on Delivery');
      await sleep(4000);
      resp = printResponse();
    }
    
    console.log('\n========================================');
    console.log('   JOURNEY COMPLETE');
    console.log('========================================');
    console.log('Final state:', getLastContent().substring(0, 200));
    
    socket.disconnect();
    process.exit(0);
  });
  
  socket.on('message', (data) => {
    messages.push(data);
  });
  
  socket.on('connect_error', (err) => {
    console.error('[ERROR]', err.message);
    process.exit(1);
  });
}

runFullJourney().catch(console.error);
