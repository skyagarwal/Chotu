const { io } = require('socket.io-client');

const WS_URL = 'http://localhost:3200/ai-agent';
const SESSION_ID = 'parcel-full-' + Date.now();
const TEST_PHONE = '9999888877';

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function runParcelJourney() {
  console.log('\n========================================');
  console.log('   FULL PARCEL JOURNEY TEST');
  console.log('========================================');
  console.log('Session:', SESSION_ID, '\n');
  
  var socket = io(WS_URL, { transports: ['websocket'] });
  var messages = [];
  
  function sendMessage(msg) {
    console.log('[USER] ' + msg);
    messages = [];
    socket.emit('message:send', {
      sessionId: SESSION_ID,
      message: msg,
      platform: 'web',
      type: 'text'
    });
  }
  
  function sendLocation(lat, lng, label) {
    console.log('[USER] 📍 ' + label + ' (' + lat + ', ' + lng + ')');
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
    var m = messages[messages.length - 1];
    return (m.content || m.text || '');
  }
  
  function printResponse() {
    var content = getLastContent();
    console.log('[BOT]', content.substring(0, 200) || '...');
    if (messages.length > 0 && messages[messages.length - 1].buttons) {
      console.log('     Buttons:', messages[messages.length - 1].buttons.map(function(b) { return b.label; }).join(', '));
    }
    return content.toLowerCase();
  }
  
  socket.on('connect', async function() {
    console.log('[OK] Connected\n');
    socket.emit('session:join', { sessionId: SESSION_ID, platform: 'web' });
    await sleep(1000);
    
    // 1. Start parcel
    sendMessage('I want to send a parcel');
    await sleep(3000);
    printResponse();
    
    // 2. Phone
    sendMessage(TEST_PHONE);
    await sleep(3000);
    printResponse();
    
    // 3. OTP
    sendMessage('123456');
    await sleep(3000);
    var resp = printResponse();
    
    // 4. Pickup location
    sendLocation(19.9975, 73.7898, 'Pickup: Nashik Main');
    await sleep(4000);
    resp = printResponse();
    
    // 5. Delivery location (different coordinates)
    sendLocation(20.0063, 73.7606, 'Delivery: CB Nagar');
    await sleep(4000);
    resp = printResponse();
    
    // 6. Check what's next
    if (resp.includes('recipient') || resp.includes('name') || resp.includes('phone')) {
      console.log('\n[STEP] Providing recipient details...');
      sendMessage('Rahul, 9876543210');
      await sleep(3000);
      resp = printResponse();
    }
    
    // 7. Parcel category
    if (resp.includes('category') || resp.includes('type') || resp.includes('select') || resp.includes('what')) {
      console.log('\n[STEP] Selecting category...');
      sendMessage('Documents');
      await sleep(3000);
      resp = printResponse();
    }
    
    // 8. Parcel weight/details
    if (resp.includes('weight') || resp.includes('describe') || resp.includes('details')) {
      console.log('\n[STEP] Providing weight...');
      sendMessage('500 grams');
      await sleep(3000);
      resp = printResponse();
    }
    
    // 9. Price confirmation
    if (resp.includes('₹') || resp.includes('cost') || resp.includes('price') || resp.includes('confirm')) {
      console.log('\n[STEP] Confirming order...');
      sendMessage('confirm');
      await sleep(3000);
      resp = printResponse();
    }
    
    // 10. Payment
    if (resp.includes('payment') || resp.includes('pay')) {
      console.log('\n[STEP] Selecting payment...');
      sendMessage('Cash on Delivery');
      await sleep(3000);
      resp = printResponse();
    }
    
    console.log('\n========================================');
    console.log('   JOURNEY COMPLETE');
    console.log('========================================');
    console.log('Final:', getLastContent().substring(0, 400));
    
    socket.disconnect();
    process.exit(0);
  });
  
  socket.on('message', function(data) {
    messages.push(data);
  });
  
  socket.on('connect_error', function(err) {
    console.error('[ERROR]', err.message);
    process.exit(1);
  });
}

runParcelJourney().catch(console.error);
