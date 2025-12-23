(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/websocket/chat-client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// WebSocket Client for Real-time Chat
__turbopack_context__.s([
    "disconnectChatWS",
    ()=>disconnectChatWS,
    "getChatWSClient",
    ()=>getChatWSClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/socket.io-client/build/esm/index.js [app-client] (ecmascript) <locals>");
;
// Auto-detect WebSocket URL based on current origin
const getWsUrl = ()=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // Client-side: use same origin as the page
    const { protocol, hostname } = window.location;
    // If accessing via chat.mangwale.ai (HTTPS), use same domain with /ws proxy
    if (hostname === 'chat.mangwale.ai') {
        return `${protocol}//${hostname}` // https://chat.mangwale.ai (needs nginx/caddy proxy to :3201)
        ;
    }
    // For localhost/dev, use the env var or default to orchestrator port 3201
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return ("TURBOPACK compile-time value", "http://localhost:3201") || 'http://localhost:3201';
    }
    // For other cases (like Tailscale IP), use same protocol and orchestrator port 3201
    return ("TURBOPACK compile-time value", "http://localhost:3201") || `${protocol}//${hostname}:3201`;
};
class ChatWebSocketClient {
    socket = null;
    handlers = {};
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    constructor(){
        this.connect();
    }
    connect() {
        if (this.socket?.connected) {
            return;
        }
        const wsUrl = getWsUrl();
        console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
        this.socket = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["io"])(wsUrl, {
            transports: [
                'websocket',
                'polling'
            ],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000
        });
        this.setupEventListeners();
    }
    setupEventListeners() {
        if (!this.socket) return;
        this.socket.on('connect', ()=>{
            console.log('✅ WebSocket connected');
            this.reconnectAttempts = 0;
            this.handlers.onConnect?.();
        });
        this.socket.on('disconnect', ()=>{
            console.log('❌ WebSocket disconnected');
            this.handlers.onDisconnect?.();
        });
        this.socket.on('message', (message)=>{
            this.handlers.onMessage?.(message);
        });
        this.socket.on('session:update', (session)=>{
            this.handlers.onSessionUpdate?.(session);
        });
        this.socket.on('session:joined', (data)=>{
            console.log('📥 Session joined:', data.sessionId, 'History:', data.history.length);
            // Emit history messages to handler
            data.history.forEach((msg)=>this.handlers.onMessage?.(msg));
        });
        this.socket.on('typing', (isTyping)=>{
            this.handlers.onTyping?.(isTyping);
        });
        this.socket.on('error', (error)=>{
            console.error('❌ WebSocket error:', error);
            this.handlers.onError?.(error);
        });
        this.socket.on('connect_error', (error)=>{
            console.error('❌ WebSocket connection error:', error);
            this.handlers.onError?.(error);
        });
        this.socket.on('reconnect_attempt', (attemptNumber)=>{
            this.reconnectAttempts = attemptNumber;
            console.log(`🔄 Reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts}`);
        });
        this.socket.on('reconnect_failed', ()=>{
            console.error('❌ WebSocket reconnection failed');
            this.handlers.onError?.(new Error('Failed to reconnect to WebSocket'));
        });
    }
    // Register event handlers
    on(handlers) {
        this.handlers = {
            ...this.handlers,
            ...handlers
        };
    }
    // Join a session room
    joinSession(sessionId, authData) {
        if (!this.socket?.connected) {
            console.warn('⚠️ Socket not connected, attempting to connect...');
            this.connect();
        }
        console.log('📱 Joining session:', sessionId, authData ? '(authenticated)' : '(guest)');
        this.socket?.emit('session:join', {
            sessionId,
            ...authData
        });
    }
    // Leave a session room
    leaveSession(sessionId) {
        console.log('👋 Leaving session:', sessionId);
        this.socket?.emit('session:leave', {
            sessionId
        });
    }
    // Send a message
    sendMessage(payload) {
        if (!this.socket?.connected) {
            throw new Error('WebSocket not connected');
        }
        console.log('📤 Sending message:', payload);
        this.socket.emit('message:send', payload);
    }
    // Send typing indicator
    sendTyping(sessionId, isTyping) {
        this.socket?.emit('typing', {
            sessionId,
            isTyping
        });
    }
    // Handle option click
    handleOptionClick(payload) {
        if (!this.socket?.connected) {
            throw new Error('WebSocket not connected');
        }
        console.log('🖱️ Handling option click:', payload);
        this.socket.emit('option:click', payload);
    }
    // Update location
    updateLocation(sessionId, lat, lng) {
        console.log('📍 Updating location:', {
            sessionId,
            lat,
            lng
        });
        this.socket?.emit('location:update', {
            sessionId,
            lat,
            lng
        });
    }
    // Check connection status
    isConnected() {
        return this.socket?.connected || false;
    }
    // Disconnect
    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }
    // Reconnect manually
    reconnect() {
        this.disconnect();
        this.connect();
    }
}
// Singleton instance
let chatWSClient = null;
const getChatWSClient = ()=>{
    if (!chatWSClient) {
        chatWSClient = new ChatWebSocketClient();
    }
    return chatWSClient;
};
const disconnectChatWS = ()=>{
    chatWSClient?.disconnect();
    chatWSClient = null;
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/utils/helpers.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn,
    "debounce",
    ()=>debounce,
    "formatCurrency",
    ()=>formatCurrency,
    "formatDate",
    ()=>formatDate,
    "formatDistance",
    ()=>formatDistance,
    "formatTime",
    ()=>formatTime,
    "generateId",
    ()=>generateId,
    "parseButtonsFromText",
    ()=>parseButtonsFromText,
    "parseCardsFromText",
    ()=>parseCardsFromText
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
function formatCurrency(amount, currency = "INR") {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        minimumFractionDigits: 0
    }).format(amount);
}
function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
}
function formatTime(date) {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
    });
}
function formatDate(date) {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}
function debounce(func, wait) {
    let timeout = null;
    return (...args)=>{
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(()=>func(...args), wait);
    };
}
const generateId = ()=>{
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};
const parseButtonsFromText = (text)=>{
    // Match patterns like "1️⃣ Option text" or "1. Option text" or "[BUTTON:Label:value]"
    const emojiPattern = /(\d)️⃣\s*([^\n]+)/g;
    const numberPattern = /^(\d+)\.\s*([^\n]+)/gm;
    const buttonPattern = /\[BUTTON:([^:]+):([^\]]+)\]/g;
    const buttons = [];
    let cleanText = text;
    // Check for special button syntax [BUTTON:label:value]
    let match;
    while((match = buttonPattern.exec(text)) !== null){
        const label = match[1].trim();
        const value = match[2].trim();
        buttons.push({
            id: `btn-${buttons.length}`,
            label: label,
            value: value
        });
    }
    // Remove button markers from text
    cleanText = cleanText.replace(buttonPattern, '').trim();
    // Check for emoji-numbered options (1️⃣, 2️⃣)
    if (buttons.length === 0) {
        while((match = emojiPattern.exec(text)) !== null){
            const number = match[1];
            const label = match[2].trim().replace(/[📱📘🍔🛒🏨🎬🔧📦🚗❤️]/g, '').trim();
            buttons.push({
                id: `option-${number}`,
                label: label,
                value: number
            });
        }
    }
    // Check for regular numbered options (1., 2.)
    if (buttons.length === 0) {
        while((match = numberPattern.exec(text)) !== null){
            const number = match[1];
            const label = match[2].trim().replace(/[📱📘🍔🛒🏨🎬🔧📦🚗❤️]/g, '').trim();
            buttons.push({
                id: `option-${number}`,
                label: label,
                value: number
            });
        }
    }
    // If we found buttons, clean the text
    if (buttons.length > 0) {
        // Remove the button lines but keep the header
        cleanText = text.replace(/(\d)️⃣\s*[^\n]+/g, '').replace(/^\d+\.\s*[^\n]+$/gm, '').replace(/Reply with \d+ or \d+:?/gi, '').replace(/Please choose.*:/gi, '').replace(/\n{3,}/g, '\n\n').trim();
    }
    return {
        cleanText,
        buttons
    };
};
const parseCardsFromText = (text)=>{
    const cards = [];
    let cleanText = text;
    // Pattern for card format:
    // 🍕 Pizza Palace
    // ⭐ 4.5 stars | 🚚 25-30 mins
    // Order Now → order:pizza-palace
    const cardPattern = /([🍕🍔🍜🍱🥘🌮🍛🥗🍝🍖🥙🌯])\s*([^\n]+)\n⭐\s*([\d.]+)\s*stars?\s*\|\s*🚚\s*([^\n]+)\n(?:💰\s*([^\n]+)\n)?(?:([^\n]+)\n)?Order Now\s*→\s*([^\n]+)/gi;
    let match;
    while((match = cardPattern.exec(text)) !== null){
        const emoji = match[1];
        const name = match[2].trim();
        const rating = parseFloat(match[3]);
        const deliveryTime = match[4].trim();
        const price = match[5]?.trim();
        const description = match[6]?.trim();
        const actionValue = match[7].trim();
        cards.push({
            id: `card-${cards.length + 1}`,
            name,
            image: emoji,
            rating,
            deliveryTime,
            price,
            description,
            action: {
                label: 'Order Now',
                value: actionValue
            }
        });
    }
    // If we found cards, remove them from text
    if (cards.length > 0) {
        cleanText = text.replace(cardPattern, '').replace(/\n{3,}/g, '\n\n').trim();
    }
    return {
        cleanText,
        cards
    };
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/chat/ProductCard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProductCard",
    ()=>ProductCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/star.js [app-client] (ecmascript) <export default as Star>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
function ProductCard(t0) {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(32);
    if ($[0] !== "a92d861c2da177681015e47f24182c7eb077b72b3971638f7a1df42af5efb324") {
        for(let $i = 0; $i < 32; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "a92d861c2da177681015e47f24182c7eb077b72b3971638f7a1df42af5efb324";
    }
    const { card, onAction } = t0;
    const [imageError, setImageError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const renderStars = _ProductCardRenderStars;
    let t1;
    if ($[1] !== card.name) {
        t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
            className: "font-bold text-lg text-gray-900 mb-2",
            children: card.name
        }, void 0, false, {
            fileName: "[project]/src/components/chat/ProductCard.tsx",
            lineNumber: 26,
            columnNumber: 10
        }, this);
        $[1] = card.name;
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    let t2;
    if ($[3] !== card.rating) {
        t2 = card.rating && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mb-2",
            children: renderStars(card.rating)
        }, void 0, false, {
            fileName: "[project]/src/components/chat/ProductCard.tsx",
            lineNumber: 34,
            columnNumber: 25
        }, this);
        $[3] = card.rating;
        $[4] = t2;
    } else {
        t2 = $[4];
    }
    let t3;
    if ($[5] !== card.deliveryTime) {
        t3 = card.deliveryTime && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-sm font-medium text-gray-600 mb-3",
            children: [
                "🚚 ",
                card.deliveryTime
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/chat/ProductCard.tsx",
            lineNumber: 42,
            columnNumber: 31
        }, this);
        $[5] = card.deliveryTime;
        $[6] = t3;
    } else {
        t3 = $[6];
    }
    let t4;
    if ($[7] !== card.price) {
        t4 = card.price && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-xl font-bold text-[#059211] mb-3",
            children: card.price
        }, void 0, false, {
            fileName: "[project]/src/components/chat/ProductCard.tsx",
            lineNumber: 50,
            columnNumber: 24
        }, this);
        $[7] = card.price;
        $[8] = t4;
    } else {
        t4 = $[8];
    }
    let t5;
    if ($[9] !== card.description) {
        t5 = card.description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
            className: "text-sm text-gray-600 mb-4 line-clamp-2",
            children: card.description
        }, void 0, false, {
            fileName: "[project]/src/components/chat/ProductCard.tsx",
            lineNumber: 58,
            columnNumber: 30
        }, this);
        $[9] = card.description;
        $[10] = t5;
    } else {
        t5 = $[10];
    }
    let t6;
    if ($[11] !== card.action.value || $[12] !== onAction) {
        t6 = ({
            "ProductCard[<button>.onClick]": ()=>onAction(card.action.value)
        })["ProductCard[<button>.onClick]"];
        $[11] = card.action.value;
        $[12] = onAction;
        $[13] = t6;
    } else {
        t6 = $[13];
    }
    let t7;
    if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            children: "→"
        }, void 0, false, {
            fileName: "[project]/src/components/chat/ProductCard.tsx",
            lineNumber: 77,
            columnNumber: 10
        }, this);
        $[14] = t7;
    } else {
        t7 = $[14];
    }
    let t8;
    if ($[15] !== card.action.label || $[16] !== t6) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            onClick: t6,
            className: "w-full bg-gradient-to-r from-[#059211] to-[#047a0e] hover:shadow-xl text-white font-bold py-3 px-6 rounded-full transition-all duration-200 shadow-lg flex items-center justify-center gap-2 transform hover:scale-105",
            children: [
                card.action.label,
                t7
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/chat/ProductCard.tsx",
            lineNumber: 84,
            columnNumber: 10
        }, this);
        $[15] = card.action.label;
        $[16] = t6;
        $[17] = t8;
    } else {
        t8 = $[17];
    }
    let t9;
    if ($[18] !== t1 || $[19] !== t2 || $[20] !== t3 || $[21] !== t4 || $[22] !== t5 || $[23] !== t8) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex-1",
            children: [
                t1,
                t2,
                t3,
                t4,
                t5,
                t8
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/chat/ProductCard.tsx",
            lineNumber: 93,
            columnNumber: 10
        }, this);
        $[18] = t1;
        $[19] = t2;
        $[20] = t3;
        $[21] = t4;
        $[22] = t5;
        $[23] = t8;
        $[24] = t9;
    } else {
        t9 = $[24];
    }
    let t10;
    if ($[25] !== card.image || $[26] !== card.name || $[27] !== imageError) {
        t10 = card.image && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "w-28 h-28 flex-shrink-0",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 shadow-md",
                children: imageError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-full h-full flex items-center justify-center text-5xl",
                    children: "🍕"
                }, void 0, false, {
                    fileName: "[project]/src/components/chat/ProductCard.tsx",
                    lineNumber: 106,
                    columnNumber: 193
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    src: card.image,
                    alt: card.name,
                    width: 112,
                    height: 112,
                    className: "w-full h-full object-cover",
                    onError: {
                        "ProductCard[<Image>.onError]": ()=>setImageError(true)
                    }["ProductCard[<Image>.onError]"],
                    unoptimized: true
                }, void 0, false, {
                    fileName: "[project]/src/components/chat/ProductCard.tsx",
                    lineNumber: 106,
                    columnNumber: 277
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/chat/ProductCard.tsx",
                lineNumber: 106,
                columnNumber: 66
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/chat/ProductCard.tsx",
            lineNumber: 106,
            columnNumber: 25
        }, this);
        $[25] = card.image;
        $[26] = card.name;
        $[27] = imageError;
        $[28] = t10;
    } else {
        t10 = $[28];
    }
    let t11;
    if ($[29] !== t10 || $[30] !== t9) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-xl p-5 max-w-sm border-2 border-gray-100 hover:border-[#059211] transition-all duration-200",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex gap-4",
                children: [
                    t9,
                    t10
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/chat/ProductCard.tsx",
                lineNumber: 118,
                columnNumber: 195
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/chat/ProductCard.tsx",
            lineNumber: 118,
            columnNumber: 11
        }, this);
        $[29] = t10;
        $[30] = t9;
        $[31] = t11;
    } else {
        t11 = $[31];
    }
    return t11;
}
_s(ProductCard, "gLR0P7wgc8ZXiun/rQPANvAzwwQ=");
_c = ProductCard;
function _ProductCardRenderStars(rating) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center gap-1",
        children: [
            [
                ...Array(5)
            ].map({
                "ProductCard[renderStars > (anonymous)()]": (_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__["Star"], {
                        className: `w-4 h-4 ${i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`
                    }, i, false, {
                        fileName: "[project]/src/components/chat/ProductCard.tsx",
                        lineNumber: 129,
                        columnNumber: 61
                    }, this)
            }["ProductCard[renderStars > (anonymous)()]"]),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-sm font-medium text-gray-700 ml-1",
                children: rating
            }, void 0, false, {
                fileName: "[project]/src/components/chat/ProductCard.tsx",
                lineNumber: 130,
                columnNumber: 52
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/chat/ProductCard.tsx",
        lineNumber: 128,
        columnNumber: 10
    }, this);
}
var _c;
__turbopack_context__.k.register(_c, "ProductCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "api",
    ()=>api,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [app-client] (ecmascript)");
;
const API_URL = ("TURBOPACK compile-time value", "https://chat.mangwale.ai/api-gateway/api") || 'http://localhost:4001/api';
// Create axios instance
const apiClient = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: API_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});
// Request interceptor - add auth token
apiClient.interceptors.request.use((config)=>{
    if ("TURBOPACK compile-time truthy", 1) {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
            try {
                const { state } = JSON.parse(authStorage);
                const token = state?.token;
                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (error) {
                console.error('Failed to parse auth token:', error);
            }
        }
    }
    return config;
}, (error)=>{
    return Promise.reject(error);
});
// Response interceptor - handle errors
apiClient.interceptors.response.use((response)=>response, (error)=>{
    if (error.response?.status === 401) {
        // Unauthorized - clear token and redirect to login
        if ("TURBOPACK compile-time truthy", 1) {
            localStorage.removeItem('auth-storage');
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});
const api = {
    // Auth
    auth: {
        sendOtp: (phone)=>apiClient.post('/v1/auth/send-otp', {
                phone
            }),
        verifyOtp: (phone, otp)=>apiClient.post('/v1/auth/verify-otp', {
                phone,
                otp
            }),
        updateUserInfo: (data)=>apiClient.post('/v1/auth/update-info', data),
        getProfile: ()=>apiClient.get('/v1/auth/profile'),
        updateProfile: (data)=>apiClient.put('/v1/auth/profile', data),
        logout: ()=>apiClient.post('/v1/auth/logout')
    },
    // Orders
    orders: {
        list: (params)=>apiClient.get('/v1/orders', {
                params
            }),
        get: (id)=>apiClient.get(`/v1/orders/${id}`),
        create: (data)=>apiClient.post('/v1/orders', data),
        track: (id)=>apiClient.get(`/v1/orders/${id}/track`),
        cancel: (id, reason)=>apiClient.put(`/v1/orders/${id}/cancel`, {
                reason
            })
    },
    // Addresses
    addresses: {
        list: ()=>apiClient.get('/v1/addresses'),
        get: (id)=>apiClient.get(`/v1/addresses/${id}`),
        create: (data)=>apiClient.post('/v1/addresses', data),
        update: (id, data)=>apiClient.put(`/v1/addresses/${id}`, data),
        delete: (id)=>apiClient.delete(`/v1/addresses/${id}`)
    },
    // Payments
    payments: {
        methods: ()=>apiClient.get('/v1/payments/methods'),
        initiate: (data)=>apiClient.post('/v1/payments/initiate', data),
        verify: (data)=>apiClient.post('/v1/payments/verify', data)
    },
    // Parcel Module
    parcel: {
        getVehicles: ()=>apiClient.get('/v1/parcel/vehicles'),
        calculateDistance: (data)=>apiClient.post('/v1/parcel/calculate-distance', data),
        getCharges: (params)=>apiClient.get('/v1/parcel/vehicle-charges', {
                params
            }),
        createOrder: (data)=>apiClient.post('/v1/parcel/orders', data),
        trackOrder: (orderId)=>apiClient.get(`/v1/parcel/orders/${orderId}/track`)
    },
    // Health
    health: ()=>apiClient.get('/health')
};
const __TURBOPACK__default__export__ = apiClient;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/store/authStore.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAuthStore",
    ()=>useAuthStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/middleware.mjs [app-client] (ecmascript)");
;
;
const useAuthStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])()((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["persist"])((set)=>({
        user: null,
        token: null,
        isAuthenticated: false,
        _hasHydrated: false,
        setAuth: (user, token)=>{
            set({
                user,
                token,
                isAuthenticated: true
            });
        },
        clearAuth: ()=>{
            set({
                user: null,
                token: null,
                isAuthenticated: false
            });
        },
        updateUser: (userData)=>set((state)=>({
                    user: state.user ? {
                        ...state.user,
                        ...userData
                    } : null
                })),
        setHasHydrated: (hasHydrated)=>{
            set({
                _hasHydrated: hasHydrated
            });
        }
    }), {
    name: 'auth-storage',
    storage: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createJSONStorage"])(()=>localStorage),
    onRehydrateStorage: ()=>(state)=>{
            state?.setHasHydrated(true);
        }
}));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/chat/InlineLogin.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InlineLogin",
    ()=>InlineLogin
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/phone.js [app-client] (ecmascript) <export default as Phone>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/lock.js [app-client] (ecmascript) <export default as Lock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user.js [app-client] (ecmascript) <export default as User>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/mail.js [app-client] (ecmascript) <export default as Mail>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/store/authStore.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function InlineLogin({ onClose, onSuccess }) {
    _s();
    const [step, setStep] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('phone');
    const [phone, setPhone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [otp, setOtp] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [firstName, setFirstName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [lastName, setLastName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [email, setEmail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const { setAuth } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"])();
    const handleSendOtp = async ()=>{
        if (phone.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }
        setLoading(true);
        setError('');
        try {
            // Backend will normalize phone number
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].auth.sendOtp(phone);
            setStep('otp');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
        } finally{
            setLoading(false);
        }
    };
    const handleVerifyOtp = async ()=>{
        if (otp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }
        setLoading(true);
        setError('');
        try {
            // Backend will normalize phone number
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].auth.verifyOtp(phone, otp);
            const { token, user } = response.data;
            // Check if user needs to complete registration
            if (user.is_personal_info === 0) {
                setStep('register');
            } else {
                // Login successful - save to store
                setAuth(user, token);
                onSuccess();
            }
        } catch (err_0) {
            setError(err_0.response?.data?.message || 'Invalid OTP. Please try again.');
        } finally{
            setLoading(false);
        }
    };
    const handleRegister = async ()=>{
        if (!firstName || !email) {
            setError('Please fill in all required fields');
            return;
        }
        setLoading(true);
        setError('');
        try {
            // Call update-info endpoint - backend will normalize phone
            const response_0 = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].auth.updateUserInfo({
                phone: phone,
                f_name: firstName,
                l_name: lastName || '',
                email
            });
            const { token: token_0, user: user_0 } = response_0.data;
            setAuth(user_0, token_0);
            onSuccess();
        } catch (err_1) {
            setError(err_1.response?.data?.message || 'Failed to complete registration. Please try again.');
        } finally{
            setLoading(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: onClose,
                    className: "absolute top-4 right-4 text-gray-400 hover:text-gray-600",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                        className: "w-6 h-6"
                    }, void 0, false, {
                        fileName: "[project]/src/components/chat/InlineLogin.tsx",
                        lineNumber: 103,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                    lineNumber: 102,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-2xl font-bold text-gray-900",
                            children: [
                                step === 'phone' && 'Login to Continue',
                                step === 'otp' && 'Verify OTP',
                                step === 'register' && 'Complete Your Profile'
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                            lineNumber: 108,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-gray-500 mt-2",
                            children: [
                                step === 'phone' && 'Enter your phone number to get started',
                                step === 'otp' && `We sent a code to ${phone}`,
                                step === 'register' && 'Just a few more details'
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                            lineNumber: 113,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                    lineNumber: 107,
                    columnNumber: 9
                }, this),
                error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4",
                    children: error
                }, void 0, false, {
                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                    lineNumber: 121,
                    columnNumber: 19
                }, this),
                step === 'phone' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-sm font-medium text-gray-700 mb-2",
                                    children: "Phone Number"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                    lineNumber: 128,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "relative",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$phone$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Phone$3e$__["Phone"], {
                                            className: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                            lineNumber: 132,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "tel",
                                            value: phone,
                                            onChange: (e)=>setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)),
                                            placeholder: "10-digit mobile number",
                                            className: "w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                                            maxLength: 10
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                            lineNumber: 133,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                    lineNumber: 131,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                            lineNumber: 127,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: handleSendOtp,
                            disabled: loading || phone.length !== 10,
                            className: "w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors",
                            children: loading ? 'Sending...' : 'Send OTP'
                        }, void 0, false, {
                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                            lineNumber: 137,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                    lineNumber: 126,
                    columnNumber: 30
                }, this),
                step === 'otp' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-sm font-medium text-gray-700 mb-2",
                                    children: "Enter OTP"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                    lineNumber: 145,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "relative",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                                            className: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                            lineNumber: 149,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: otp,
                                            onChange: (e_0)=>setOtp(e_0.target.value.replace(/\D/g, '').slice(0, 6)),
                                            placeholder: "6-digit OTP",
                                            className: "w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest",
                                            maxLength: 6
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                            lineNumber: 150,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                    lineNumber: 148,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                            lineNumber: 144,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: handleVerifyOtp,
                            disabled: loading || otp.length !== 6,
                            className: "w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors",
                            children: loading ? 'Verifying...' : 'Verify OTP'
                        }, void 0, false, {
                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                            lineNumber: 154,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setStep('phone'),
                            className: "w-full text-gray-600 py-2 text-sm hover:text-gray-800",
                            children: "Change phone number"
                        }, void 0, false, {
                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                            lineNumber: 158,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                    lineNumber: 143,
                    columnNumber: 28
                }, this),
                step === 'register' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-sm font-medium text-gray-700 mb-2",
                                    children: [
                                        "First Name ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-red-500",
                                            children: "*"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                            lineNumber: 167,
                                            columnNumber: 28
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                    lineNumber: 166,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "relative",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"], {
                                            className: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                            lineNumber: 170,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: firstName,
                                            onChange: (e_1)=>setFirstName(e_1.target.value),
                                            placeholder: "Enter your first name",
                                            className: "w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                            lineNumber: 171,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                    lineNumber: 169,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                            lineNumber: 165,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-sm font-medium text-gray-700 mb-2",
                                    children: "Last Name"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                    lineNumber: 176,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "relative",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"], {
                                            className: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                            lineNumber: 180,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: lastName,
                                            onChange: (e_2)=>setLastName(e_2.target.value),
                                            placeholder: "Enter your last name (optional)",
                                            className: "w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                            lineNumber: 181,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                    lineNumber: 179,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                            lineNumber: 175,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-sm font-medium text-gray-700 mb-2",
                                    children: [
                                        "Email ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-red-500",
                                            children: "*"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                            lineNumber: 187,
                                            columnNumber: 23
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                    lineNumber: 186,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "relative",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"], {
                                            className: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                            lineNumber: 190,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "email",
                                            value: email,
                                            onChange: (e_3)=>setEmail(e_3.target.value),
                                            placeholder: "your@email.com",
                                            className: "w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                            lineNumber: 191,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                                    lineNumber: 189,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                            lineNumber: 185,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: handleRegister,
                            disabled: loading || !firstName || !email,
                            className: "w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors",
                            children: loading ? 'Completing...' : 'Complete Registration'
                        }, void 0, false, {
                            fileName: "[project]/src/components/chat/InlineLogin.tsx",
                            lineNumber: 195,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/chat/InlineLogin.tsx",
                    lineNumber: 164,
                    columnNumber: 33
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/chat/InlineLogin.tsx",
            lineNumber: 100,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/chat/InlineLogin.tsx",
        lineNumber: 99,
        columnNumber: 10
    }, this);
}
_s(InlineLogin, "s3v2YpfFXn7/H0k2ki1mRtLnhpM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"]
    ];
});
_c = InlineLogin;
var _c;
__turbopack_context__.k.register(_c, "InlineLogin");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/(public)/chat/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ChatPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/send.js [app-client] (ecmascript) <export default as Send>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mic$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/mic.js [app-client] (ecmascript) <export default as Mic>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/map-pin.js [app-client] (ecmascript) <export default as MapPin>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-left.js [app-client] (ecmascript) <export default as ArrowLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Map$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/map.js [app-client] (ecmascript) <export default as Map>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user.js [app-client] (ecmascript) <export default as User>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/rotate-ccw.js [app-client] (ecmascript) <export default as RotateCcw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$script$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/script.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$websocket$2f$chat$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/websocket/chat-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$helpers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/helpers.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$ProductCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/chat/ProductCard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$InlineLogin$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/chat/InlineLogin.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/shared/lib/app-dynamic.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/store/authStore.ts [app-client] (ecmascript)");
;
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
;
;
;
// Use Google Maps based location picker for better UX
// Backend still uses OSRM for distance calculations (cost-effective)
const LocationPicker = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$shared$2f$lib$2f$app$2d$dynamic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(()=>__turbopack_context__.A("[project]/src/components/map/LocationPicker.tsx [app-client] (ecmascript, next/dynamic entry, async loader)"), {
    loadableGenerated: {
        modules: [
            "[project]/src/components/map/LocationPicker.tsx [app-client] (ecmascript, next/dynamic entry)"
        ]
    },
    ssr: false
});
_c = LocationPicker;
const modules = [
    {
        id: 'food',
        name: 'Food',
        emoji: '🍔'
    },
    {
        id: 'ecom',
        name: 'Shopping',
        emoji: '🛒'
    },
    {
        id: 'rooms',
        name: 'Hotels',
        emoji: '🏨'
    },
    {
        id: 'movies',
        name: 'Movies',
        emoji: '🎬'
    },
    {
        id: 'services',
        name: 'Services',
        emoji: '🔧'
    },
    {
        id: 'parcel',
        name: 'Parcel',
        emoji: '📦'
    },
    {
        id: 'ride',
        name: 'Ride',
        emoji: '🚗'
    },
    {
        id: 'health',
        name: 'Health',
        emoji: '❤️'
    }
];
function ChatPage() {
    _s();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const moduleParam = searchParams.get('module');
    const { isAuthenticated, user, _hasHydrated } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"])();
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([
        {
            id: '1',
            role: 'assistant',
            content: 'Hi! 👋 Welcome to Mangwale. I\'m here to help you with deliveries, food, shopping, and more. Feel free to ask me anything about Nashik or just chat!\n\nYou can browse without logging in, but you\'ll need to login when placing orders. How can I help you today?',
            timestamp: 0
        }
    ]);
    const [input, setInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [isTyping, setIsTyping] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [selectedModule, setSelectedModule] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(moduleParam);
    const [isGettingLocation, setIsGettingLocation] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showLocationPicker, setShowLocationPicker] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showLoginModal, setShowLoginModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showProfile, setShowProfile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [userProfile, setUserProfile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Generate or retrieve persistent session ID from localStorage
    const [sessionIdState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "ChatPage.useState": ()=>{
            if ("TURBOPACK compile-time truthy", 1) {
                const stored = localStorage.getItem('mangwale-chat-session-id');
                if (stored) {
                    console.log('🔄 Reusing existing session:', stored);
                    return stored;
                }
            }
            const newSessionId = `web-${Date.now()}`;
            if ("TURBOPACK compile-time truthy", 1) {
                localStorage.setItem('mangwale-chat-session-id', newSessionId);
                console.log('🆕 Created new session:', newSessionId);
            }
            return newSessionId;
        }
    }["ChatPage.useState"]);
    const [isConnected, setIsConnected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const messagesEndRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const inputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const wsClientRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const profileRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Load user profile from localStorage
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            if ("TURBOPACK compile-time truthy", 1) {
                // Profile now comes from auth store, no need for separate localStorage
                // Keeping this for backward compatibility during migration
                const storedProfile = localStorage.getItem('mangwale-user-profile');
                if (storedProfile && !user) {
                    try {
                        const profile = JSON.parse(storedProfile);
                        setUserProfile(profile);
                    } catch (e) {
                        console.error('Failed to parse user profile:', e);
                    }
                } else if (user) {
                    // Sync auth store user to userProfile state
                    setUserProfile({
                        name: user.f_name + (user.l_name ? ` ${user.l_name}` : ''),
                        phone: user.phone
                    });
                }
            }
        }
    }["ChatPage.useEffect"], [
        user
    ]);
    // Close profile dropdown when clicking outside
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            const handleClickOutside = {
                "ChatPage.useEffect.handleClickOutside": (event)=>{
                    if (profileRef.current && !profileRef.current.contains(event.target)) {
                        setShowProfile(false);
                    }
                }
            }["ChatPage.useEffect.handleClickOutside"];
            if (showProfile) {
                document.addEventListener('mousedown', handleClickOutside);
            }
            return ({
                "ChatPage.useEffect": ()=>{
                    document.removeEventListener('mousedown', handleClickOutside);
                }
            })["ChatPage.useEffect"];
        }
    }["ChatPage.useEffect"], [
        showProfile
    ]);
    // REMOVE MANDATORY AUTH CHECK - Let users chat first, login when prompted naturally
    // The LLM can engage users, build rapport, then suggest login for orders/tracking
    // useEffect(() => {
    //   if (_hasHydrated && !isAuthenticated) {
    //     router.push('/login')
    //   }
    // }, [_hasHydrated, isAuthenticated, router])
    // AUTO-REQUEST LOCATION after login (delivery app needs current location)
    // Only run once when user first logs in
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
             // Skip on server
            if (isAuthenticated && user && !showLocationPicker && !localStorage.getItem('user-location-captured')) {
                // Check if we have location in session
                const hasLocation = localStorage.getItem('mangwale-user-location');
                if (!hasLocation) {
                    console.log('📍 User authenticated but no location - auto-prompting for location');
                    // Auto-open location picker after 2 seconds (only once)
                    const timer = setTimeout({
                        "ChatPage.useEffect.timer": ()=>{
                            setShowLocationPicker(true);
                        }
                    }["ChatPage.useEffect.timer"], 2000);
                    return ({
                        "ChatPage.useEffect": ()=>clearTimeout(timer)
                    })["ChatPage.useEffect"];
                }
            }
        }
    }["ChatPage.useEffect"], [
        isAuthenticated,
        user,
        showLocationPicker
    ]); // Added showLocationPicker to deps to prevent re-triggers
    const scrollToBottom = ()=>{
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth'
        });
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            scrollToBottom();
        }
    }["ChatPage.useEffect"], [
        messages
    ]);
    // Initialize WebSocket connection
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ChatPage.useEffect": ()=>{
            // Wait for auth store to hydrate from localStorage before connecting
            if (!_hasHydrated) {
                console.log('⏳ Waiting for auth store to hydrate...');
                return;
            }
            console.log('🔌 Initializing WebSocket connection...');
            const wsClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$websocket$2f$chat$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getChatWSClient"])();
            wsClientRef.current = wsClient;
            // Set up event handlers
            wsClient.on({
                onConnect: {
                    "ChatPage.useEffect": ()=>{
                        console.log('✅ WebSocket connected');
                        setIsConnected(true);
                        // Join session room with auth data if available
                        const authData = isAuthenticated && user ? {
                            userId: user.id,
                            phone: user.phone,
                            email: user.email,
                            token: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"].getState().token || undefined,
                            name: user.f_name + (user.l_name ? ` ${user.l_name}` : '')
                        } : undefined;
                        console.log('📱 Joining session with auth:', authData ? 'authenticated' : 'guest');
                        wsClient.joinSession(sessionIdState, authData);
                    }
                }["ChatPage.useEffect"],
                onDisconnect: {
                    "ChatPage.useEffect": ()=>{
                        console.log('❌ WebSocket disconnected');
                        setIsConnected(false);
                    }
                }["ChatPage.useEffect"],
                onMessage: {
                    "ChatPage.useEffect": (message)=>{
                        console.log('📨 Received message:', message);
                        // Parse buttons and cards from message content
                        const { cleanText: textAfterButtons, buttons } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$helpers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseButtonsFromText"])(message.content);
                        const { cleanText: finalText, cards } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$helpers$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseCardsFromText"])(textAfterButtons);
                        const enrichedMessage = {
                            ...message,
                            content: finalText,
                            buttons: buttons.length > 0 ? buttons : undefined,
                            cards: cards.length > 0 ? cards : undefined
                        };
                        setMessages({
                            "ChatPage.useEffect": (prev)=>[
                                    ...prev,
                                    enrichedMessage
                                ]
                        }["ChatPage.useEffect"]);
                        setIsTyping(false);
                    }
                }["ChatPage.useEffect"],
                onTyping: {
                    "ChatPage.useEffect": (isTyping_0)=>{
                        console.log('⌨️ Typing indicator:', isTyping_0);
                        setIsTyping(isTyping_0);
                    }
                }["ChatPage.useEffect"],
                onError: {
                    "ChatPage.useEffect": (error)=>{
                        console.error('WebSocket error:', error);
                        setMessages({
                            "ChatPage.useEffect": (prev_0)=>[
                                    ...prev_0,
                                    {
                                        id: `error-${Date.now()}`,
                                        role: 'assistant',
                                        content: 'Sorry, I encountered an error. Please try again.',
                                        timestamp: Date.now()
                                    }
                                ]
                        }["ChatPage.useEffect"]);
                        setIsTyping(false);
                    }
                }["ChatPage.useEffect"]
            });
            return ({
                "ChatPage.useEffect": ()=>{
                    console.log('🔌 Cleaning up WebSocket connection');
                    wsClient.leaveSession(sessionIdState);
                }
            })["ChatPage.useEffect"];
        }
    }["ChatPage.useEffect"], [
        sessionIdState,
        isAuthenticated,
        user,
        _hasHydrated
    ]);
    const handleSend = async (textInput)=>{
        const messageText = textInput || input.trim();
        if (!messageText) return;
        if (!isConnected) {
            console.error('❌ WebSocket not connected');
            setMessages((prev_1)=>[
                    ...prev_1,
                    {
                        id: `error-${Date.now()}`,
                        role: 'assistant',
                        content: 'Connection lost. Please refresh the page.',
                        timestamp: Date.now()
                    }
                ]);
            return;
        }
        try {
            console.log('🚀 Sending message via WebSocket:', messageText);
            // Add user message
            setMessages((prev_3)=>[
                    ...prev_3,
                    {
                        id: `msg-${prev_3.length}-${Date.now()}`,
                        role: 'user',
                        content: messageText,
                        timestamp: Date.now()
                    }
                ]);
            if (!textInput) setInput('');
            setIsTyping(true);
            // Send via WebSocket
            wsClientRef.current?.sendMessage({
                message: messageText,
                sessionId: sessionIdState,
                module: selectedModule || undefined
            });
            console.log('✅ Message sent via WebSocket');
        } catch (error_0) {
            console.error('Failed to send message:', error_0);
            setIsTyping(false);
            setMessages((prev_2)=>[
                    ...prev_2,
                    {
                        id: `error-${prev_2.length}`,
                        role: 'assistant',
                        content: 'Sorry, I encountered an error. Please try again.',
                        timestamp: Date.now()
                    }
                ]);
        }
    };
    const handleSendClick = ()=>{
        void handleSend();
    };
    const handleKeyPress = (e_0)=>{
        if (e_0.key === 'Enter' && !e_0.shiftKey) {
            e_0.preventDefault();
            handleSend();
        }
    };
    const handleModuleSelect = (moduleId)=>{
        setSelectedModule(moduleId);
        const selectedModuleData = modules.find((m)=>m.id === moduleId);
        setMessages((prev_4)=>[
                ...prev_4,
                {
                    id: `module-${prev_4.length}-${Date.now()}`,
                    role: 'assistant',
                    content: `Great! I'm now your ${selectedModuleData?.name} assistant. What would you like to do?`,
                    timestamp: Date.now()
                }
            ]);
    };
    const handleShareLocation = async ()=>{
        if (!navigator.geolocation) {
            setMessages((prev_5)=>[
                    ...prev_5,
                    {
                        id: `error-${Date.now()}`,
                        role: 'assistant',
                        content: '❌ Geolocation is not supported by your browser.',
                        timestamp: Date.now()
                    }
                ]);
            return;
        }
        setIsGettingLocation(true);
        setMessages((prev_6)=>[
                ...prev_6,
                {
                    id: `sys-${Date.now()}`,
                    role: 'assistant',
                    content: '📍 Requesting your location... Please allow location access.',
                    timestamp: Date.now()
                }
            ]);
        navigator.geolocation.getCurrentPosition(async (position)=>{
            const { latitude, longitude } = position.coords;
            // Send location to backend via WebSocket for session tracking
            if (wsClientRef.current) {
                wsClientRef.current.updateLocation(sessionIdState, latitude, longitude);
                // Send as text message for the conversation flow
                // This will add the message to chat and send to backend
                const locationText = `📍 My current location is: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                await handleSend(locationText);
            }
            setIsGettingLocation(false);
        }, (error_1)=>{
            let errorMsg = '❌ Unable to get your location. ';
            switch(error_1.code){
                case error_1.PERMISSION_DENIED:
                    errorMsg += 'Please enable location permissions in your browser settings.';
                    break;
                case error_1.POSITION_UNAVAILABLE:
                    errorMsg += 'Location information is unavailable.';
                    break;
                case error_1.TIMEOUT:
                    errorMsg += 'Location request timed out.';
                    break;
                default:
                    errorMsg += 'An unknown error occurred.';
            }
            setMessages((prev_7)=>[
                    ...prev_7,
                    {
                        id: `error-${Date.now()}`,
                        role: 'assistant',
                        content: errorMsg,
                        timestamp: Date.now()
                    }
                ]);
            setIsGettingLocation(false);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    };
    const handleLocationConfirm = async (location)=>{
        setShowLocationPicker(false);
        // Update user profile in auth store and localStorage
        const profile_0 = {
            name: location.contact_person_name,
            phone: location.contact_person_number
        };
        // Update auth store if user is authenticated
        if (user) {
            const { updateUser } = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"].getState();
            updateUser({
                f_name: location.contact_person_name.split(' ')[0],
                l_name: location.contact_person_name.split(' ').slice(1).join(' ') || undefined,
                phone: location.contact_person_number
            });
        }
        // Also save to localStorage for backward compatibility
        localStorage.setItem('mangwale-user-profile', JSON.stringify(profile_0));
        setUserProfile(profile_0);
        // Save location data for delivery app
        const locationData = {
            lat: location.lat,
            lng: location.lng,
            address: location.address,
            timestamp: Date.now()
        };
        localStorage.setItem('mangwale-user-location', JSON.stringify(locationData));
        localStorage.setItem('user-location-captured', 'true');
        // Send location to backend via WebSocket
        if (wsClientRef.current) {
            wsClientRef.current.updateLocation(sessionIdState, location.lat, location.lng);
        }
        // Format the complete address message for display
        let fullAddress = `${location.address}\n`;
        fullAddress += `Contact: ${location.contact_person_name} (${location.contact_person_number})\n`;
        fullAddress += `Type: ${location.address_type}`;
        if (location.house) {
            fullAddress += `\nHouse/Flat: ${location.house}`;
        }
        if (location.floor) {
            fullAddress += `, Floor: ${location.floor}`;
        }
        if (location.road) {
            fullAddress += `\nRoad: ${location.road}`;
        }
        // Add location shared message with formatted details
        const displayMessage = `📍 Location shared:\n${fullAddress}\n\nCoordinates: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
        // Send to backend - handleSend will add the message to chat
        await handleSend(displayMessage);
    };
    const currentModule = selectedModule ? modules.find((m_0)=>m_0.id === selectedModule) : null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$script$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                src: `https://maps.googleapis.com/maps/api/js?key=${("TURBOPACK compile-time value", "AIzaSyAy5piEV4luSuRIv61wM3-a2OB1rSMkswM") || ''}&libraries=places`,
                strategy: "lazyOnload",
                onLoad: ()=>console.log('✅ Google Maps API loaded')
            }, void 0, false, {
                fileName: "[project]/src/app/(public)/chat/page.tsx",
                lineNumber: 446,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col h-screen bg-[#fffff6] overflow-hidden",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-gradient-to-r from-[#059211] to-[#047a0e] text-white px-3 sm:px-4 py-3 sm:py-4 shadow-lg",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "container mx-auto flex items-center justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2 sm:gap-3 flex-1 min-w-0",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "/",
                                            className: "hover:bg-white/10 p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                                                className: "w-4 h-4 sm:w-5 sm:h-5"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                lineNumber: 454,
                                                columnNumber: 15
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                            lineNumber: 453,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                            className: "text-base sm:text-xl font-bold truncate",
                                            children: currentModule ? `${currentModule.emoji} ${currentModule.name}` : '💬 Mangwale AI'
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                            lineNumber: 456,
                                            columnNumber: 13
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                    lineNumber: 452,
                                    columnNumber: 11
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2 sm:gap-3 flex-shrink-0",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-1.5",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: `w-2 h-2 rounded-full ${isConnected ? 'bg-green-300 animate-pulse' : 'bg-red-400'}`
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                    lineNumber: 463,
                                                    columnNumber: 15
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-xs sm:text-sm font-medium hidden sm:inline",
                                                    children: isConnected ? 'Connected' : 'Disconnected'
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                    lineNumber: 464,
                                                    columnNumber: 15
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-xs font-medium sm:hidden",
                                                    children: isConnected ? '●' : '○'
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                    lineNumber: 465,
                                                    columnNumber: 15
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                            lineNumber: 462,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>{
                                                if (confirm('Clear chat and start over?')) {
                                                    localStorage.removeItem('mangwale-chat-session-id');
                                                    window.location.reload();
                                                }
                                            },
                                            className: "hover:bg-white/10 p-1.5 sm:p-2 rounded-full transition-colors flex-shrink-0",
                                            title: "Clear chat and start over",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__["RotateCcw"], {
                                                className: "w-4 h-4 sm:w-5 sm:h-5"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                lineNumber: 475,
                                                columnNumber: 15
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                            lineNumber: 469,
                                            columnNumber: 13
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            ref: profileRef,
                                            className: "relative",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>setShowProfile(!showProfile),
                                                    className: "hover:bg-white/10 p-1.5 sm:p-2 rounded-full transition-colors flex-shrink-0",
                                                    title: "Your Profile",
                                                    children: userProfile ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "w-7 h-7 sm:w-8 sm:h-8 bg-white text-green-600 rounded-full flex items-center justify-center font-bold text-sm",
                                                        children: userProfile.name ? userProfile.name[0].toUpperCase() : userProfile.phone ? userProfile.phone[0] : 'U'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                        lineNumber: 481,
                                                        columnNumber: 32
                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"], {
                                                        className: "w-5 h-5 sm:w-6 sm:h-6"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                        lineNumber: 483,
                                                        columnNumber: 28
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                    lineNumber: 480,
                                                    columnNumber: 15
                                                }, this),
                                                showProfile && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "absolute right-0 top-12 bg-white text-gray-900 rounded-lg shadow-2xl z-50 w-64 border-2 border-gray-200 overflow-hidden",
                                                    children: userProfile ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "bg-gradient-to-br from-green-50 to-green-100 px-4 py-4 border-b-2 border-green-200",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex items-center gap-3",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl",
                                                                            children: userProfile.name ? userProfile.name[0].toUpperCase() : userProfile.phone ? userProfile.phone[0] : 'U'
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                                            lineNumber: 491,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "flex-1 min-w-0",
                                                                            children: [
                                                                                userProfile.name && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                                                    className: "font-bold text-base text-gray-900 truncate",
                                                                                    children: userProfile.name
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                                                    lineNumber: 495,
                                                                                    columnNumber: 50
                                                                                }, this),
                                                                                userProfile.phone && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                                    className: "text-sm text-gray-600",
                                                                                    children: userProfile.phone
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                                                    lineNumber: 496,
                                                                                    columnNumber: 51
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                                            lineNumber: 494,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                                    lineNumber: 490,
                                                                    columnNumber: 25
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                                lineNumber: 489,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "px-4 py-3",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: ()=>{
                                                                        // Clear ALL auth data
                                                                        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"].getState().clearAuth();
                                                                        localStorage.removeItem('mangwale-user-profile');
                                                                        localStorage.removeItem('mangwale-chat-session-id');
                                                                        localStorage.removeItem('mangwale-user-location');
                                                                        localStorage.removeItem('user-location-captured');
                                                                        setUserProfile(null);
                                                                        setShowProfile(false);
                                                                        // Disconnect WebSocket before reload
                                                                        wsClientRef.current?.disconnect();
                                                                        window.location.reload();
                                                                    },
                                                                    className: "w-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors",
                                                                    children: "Sign Out"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                                    lineNumber: 501,
                                                                    columnNumber: 25
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                                lineNumber: 500,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "px-4 py-4 text-center text-gray-600",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"], {
                                                                className: "w-12 h-12 mx-auto mb-2 text-gray-400"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                                lineNumber: 518,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-sm",
                                                                children: "No profile information"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                                lineNumber: 519,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-gray-500 mt-1",
                                                                children: "Continue chatting to save your profile"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                                lineNumber: 520,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                        lineNumber: 517,
                                                        columnNumber: 27
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                    lineNumber: 487,
                                                    columnNumber: 31
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                            lineNumber: 479,
                                            columnNumber: 13
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                    lineNumber: 460,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                            lineNumber: 451,
                            columnNumber: 9
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                        lineNumber: 450,
                        columnNumber: 7
                    }, this),
                    !selectedModule && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white border-b border-gray-200 px-3 sm:px-4 py-3 sm:py-4 shadow-sm",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "container mx-auto",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs sm:text-sm text-gray-700 font-semibold mb-2 sm:mb-3",
                                    children: "Choose a service:"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                    lineNumber: 531,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide",
                                    children: modules.map((mod)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>handleModuleSelect(mod.id),
                                            className: "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-[#059211] hover:to-[#047a0e] hover:text-white border-2 border-gray-200 hover:border-[#059211] rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-base sm:text-xl",
                                                    children: mod.emoji
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                    lineNumber: 534,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: mod.name
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                    lineNumber: 535,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, mod.id, true, {
                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                            lineNumber: 533,
                                            columnNumber: 35
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                    lineNumber: 532,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                            lineNumber: 530,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                        lineNumber: 529,
                        columnNumber: 27
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 overflow-y-auto px-2 sm:px-4 py-3 sm:py-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "container mx-auto max-w-3xl",
                            children: [
                                messages.map((message_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `flex mb-3 sm:mb-4 ${message_0.role === 'user' ? 'justify-end' : 'justify-start'}`,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: `max-w-[85%] sm:max-w-[80%] ${message_0.role === 'user' ? 'flex justify-end' : ''}`,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: `rounded-2xl px-3 sm:px-5 py-2 sm:py-3 ${message_0.role === 'user' ? 'bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-br-sm shadow-lg' : 'bg-gradient-to-br from-white to-gray-50 text-gray-900 rounded-bl-sm shadow-md border border-gray-200'}`,
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words",
                                                            children: message_0.content
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                            lineNumber: 547,
                                                            columnNumber: 19
                                                        }, this),
                                                        message_0.timestamp > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: `text-xs mt-1 sm:mt-1.5 ${message_0.role === 'user' ? 'text-green-100' : 'text-gray-400'}`,
                                                            children: new Date(message_0.timestamp).toLocaleTimeString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                            lineNumber: 548,
                                                            columnNumber: 47
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                    lineNumber: 546,
                                                    columnNumber: 17
                                                }, this),
                                                message_0.role === 'assistant' && message_0.buttons && message_0.buttons.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3",
                                                    children: message_0.buttons.map((button)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>{
                                                                // Special button: trigger login modal
                                                                if (button.value === '__LOGIN__' || button.value === '__AUTHENTICATE__') {
                                                                    setShowLoginModal(true);
                                                                } else {
                                                                    handleSend(button.value);
                                                                }
                                                            },
                                                            className: "px-3 sm:px-5 py-1.5 sm:py-2.5 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-[#059211] hover:to-[#047a0e] border-2 border-[#059211] text-[#059211] hover:text-white rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95",
                                                            children: button.label
                                                        }, button.id, false, {
                                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                            lineNumber: 558,
                                                            columnNumber: 54
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                    lineNumber: 557,
                                                    columnNumber: 105
                                                }, this),
                                                message_0.role === 'assistant' && message_0.cards && message_0.cards.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex flex-col gap-3 mt-3",
                                                    children: message_0.cards.map((card)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$ProductCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ProductCard"], {
                                                            card: card,
                                                            onAction: (value)=>handleSend(value)
                                                        }, card.id, false, {
                                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                            lineNumber: 572,
                                                            columnNumber: 50
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                    lineNumber: 571,
                                                    columnNumber: 101
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                            lineNumber: 545,
                                            columnNumber: 15
                                        }, this)
                                    }, message_0.id, false, {
                                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                                        lineNumber: 544,
                                        columnNumber: 38
                                    }, this)),
                                isTyping && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-start mb-4",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-gradient-to-br from-white to-gray-50 rounded-2xl px-5 py-4 shadow-lg border border-gray-200",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex gap-1.5",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-2.5 h-2.5 bg-[#059211] rounded-full animate-bounce",
                                                    style: {
                                                        animationDelay: '0ms'
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                    lineNumber: 580,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-2.5 h-2.5 bg-[#059211] rounded-full animate-bounce",
                                                    style: {
                                                        animationDelay: '150ms'
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                    lineNumber: 583,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-2.5 h-2.5 bg-[#059211] rounded-full animate-bounce",
                                                    style: {
                                                        animationDelay: '300ms'
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                    lineNumber: 586,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                            lineNumber: 579,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                                        lineNumber: 578,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                    lineNumber: 577,
                                    columnNumber: 24
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    ref: messagesEndRef
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                    lineNumber: 593,
                                    columnNumber: 11
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                            lineNumber: 543,
                            columnNumber: 9
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                        lineNumber: 542,
                        columnNumber: 7
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white border-t-2 border-gray-200 px-2 sm:px-4 py-2 sm:py-4 shadow-lg safe-area-bottom",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "container mx-auto max-w-3xl",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-end gap-1.5 sm:gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleShareLocation,
                                        disabled: isGettingLocation,
                                        className: "p-2 sm:p-3 bg-gray-100 text-gray-600 hover:bg-[#059211] hover:text-white rounded-full transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0",
                                        title: "Share my current location",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__["MapPin"], {
                                            className: `w-4 h-4 sm:w-5 sm:h-5 ${isGettingLocation ? 'animate-pulse' : ''}`
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                            lineNumber: 603,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                                        lineNumber: 602,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setShowLocationPicker(true),
                                        className: "p-2 sm:p-3 bg-gray-100 text-gray-600 hover:bg-[#059211] hover:text-white rounded-full transition-all duration-200 shadow-md flex-shrink-0",
                                        title: "Choose location on map",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Map$3e$__["Map"], {
                                            className: "w-4 h-4 sm:w-5 sm:h-5"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                            lineNumber: 608,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                                        lineNumber: 607,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex-1 bg-gray-100 rounded-3xl px-3 sm:px-5 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 shadow-inner border border-gray-200",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                ref: inputRef,
                                                type: "text",
                                                value: input,
                                                onChange: (e_1)=>setInput(e_1.target.value),
                                                onKeyPress: handleKeyPress,
                                                placeholder: "Ask me anything...",
                                                className: "flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                lineNumber: 613,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "text-gray-500 hover:text-[#059211] transition-colors flex-shrink-0",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mic$3e$__["Mic"], {
                                                    className: "w-4 h-4 sm:w-5 sm:h-5"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                    lineNumber: 615,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(public)/chat/page.tsx",
                                                lineNumber: 614,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                                        lineNumber: 612,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleSendClick,
                                        disabled: !input.trim() || isTyping,
                                        className: "p-3 sm:p-4 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-full hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg transform hover:scale-110 active:scale-95 flex-shrink-0",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"], {
                                            className: "w-4 h-4 sm:w-5 sm:h-5"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                                            lineNumber: 621,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                                        lineNumber: 620,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(public)/chat/page.tsx",
                                lineNumber: 600,
                                columnNumber: 11
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(public)/chat/page.tsx",
                            lineNumber: 599,
                            columnNumber: 9
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                        lineNumber: 598,
                        columnNumber: 7
                    }, this),
                    showLocationPicker && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LocationPicker, {
                        onLocationConfirm: handleLocationConfirm,
                        onCancel: ()=>setShowLocationPicker(false)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                        lineNumber: 628,
                        columnNumber: 30
                    }, this),
                    showLoginModal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$chat$2f$InlineLogin$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["InlineLogin"], {
                        onClose: ()=>setShowLoginModal(false),
                        onSuccess: ()=>{
                            setShowLoginModal(false);
                            // Optionally prompt for location after login
                            setTimeout(()=>setShowLocationPicker(true), 1000);
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/app/(public)/chat/page.tsx",
                        lineNumber: 631,
                        columnNumber: 26
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(public)/chat/page.tsx",
                lineNumber: 448,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(ChatPage, "Si96vVb4HmioMJFVSa1sw2bfvQo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$store$2f$authStore$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"]
    ];
});
_c1 = ChatPage;
var _c, _c1;
__turbopack_context__.k.register(_c, "LocationPicker");
__turbopack_context__.k.register(_c1, "ChatPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_cef33f75._.js.map