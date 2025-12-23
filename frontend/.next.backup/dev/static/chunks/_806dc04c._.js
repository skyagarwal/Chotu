(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/app/admin/agents/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AgentsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-client] (ecmascript) <export default as TrendingUp>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function AgentsPage() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(44);
    if ($[0] !== "64e4fb075a5f743b8b10dc5a57f754dd97a939c676e2f9ceac2c70cbe78ee54a") {
        for(let $i = 0; $i < 44; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "64e4fb075a5f743b8b10dc5a57f754dd97a939c676e2f9ceac2c70cbe78ee54a";
    }
    let t0;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = [
            {
                id: "agent_food",
                name: "Food Ordering Agent",
                module: "food",
                icon: "\uD83C\uDF55",
                color: "from-orange-500 to-red-500",
                status: "active",
                model: "Llama 3 8B",
                nluProvider: "nlu_food_v1",
                accuracy: 94.5,
                messagesHandled: 5893
            },
            {
                id: "agent_ecom",
                name: "E-commerce Agent",
                module: "ecom",
                icon: "\uD83D\uDECD\uFE0F",
                color: "from-blue-500 to-purple-500",
                status: "active",
                model: "Llama 3 8B",
                nluProvider: "nlu_ecom_v1",
                accuracy: 92.1,
                messagesHandled: 4231
            },
            {
                id: "agent_parcel",
                name: "Parcel Delivery Agent",
                module: "parcel",
                icon: "\uD83D\uDCE6",
                color: "from-green-500 to-teal-500",
                status: "active",
                model: "Llama 3 8B",
                nluProvider: "nlu_parcel_v1",
                accuracy: 96.8,
                messagesHandled: 3124
            },
            {
                id: "agent_ride",
                name: "Ride Booking Agent",
                module: "ride",
                icon: "\uD83D\uDE97",
                color: "from-yellow-500 to-orange-500",
                status: "active",
                model: "Llama 3 8B",
                nluProvider: "nlu_ride_v1",
                accuracy: 95.3,
                messagesHandled: 2847
            },
            {
                id: "agent_health",
                name: "Healthcare Agent",
                module: "health",
                icon: "\uD83C\uDFE5",
                color: "from-red-500 to-pink-500",
                status: "training",
                model: "Llama 3 8B",
                nluProvider: "nlu_health_v1",
                accuracy: 88.2,
                messagesHandled: 1653
            },
            {
                id: "agent_rooms",
                name: "Room Booking Agent",
                module: "rooms",
                icon: "\uD83C\uDFE8",
                color: "from-pink-500 to-rose-500",
                status: "active",
                model: "Llama 3 8B",
                nluProvider: "nlu_rooms_v1",
                accuracy: 91.7,
                messagesHandled: 1892
            },
            {
                id: "agent_movies",
                name: "Movie Booking Agent",
                module: "movies",
                icon: "\uD83C\uDFAC",
                color: "from-purple-500 to-indigo-500",
                status: "active",
                model: "Llama 3 8B",
                nluProvider: "nlu_movies_v1",
                accuracy: 93.4,
                messagesHandled: 2134
            },
            {
                id: "agent_services",
                name: "Services Agent",
                module: "services",
                icon: "\uD83D\uDCBC",
                color: "from-indigo-500 to-blue-500",
                status: "active",
                model: "Llama 3 8B",
                nluProvider: "nlu_services_v1",
                accuracy: 90.6,
                messagesHandled: 1456
            },
            {
                id: "agent_payment",
                name: "Payment Agent",
                module: "payment",
                icon: "\uD83D\uDCB3",
                color: "from-emerald-500 to-green-500",
                status: "active",
                model: "Llama 3 8B",
                nluProvider: "nlu_payment_v1",
                accuracy: 97.2,
                messagesHandled: 6789
            }
        ];
        $[1] = t0;
    } else {
        t0 = $[1];
    }
    const [agents] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(t0);
    const getStatusColor = _AgentsPageGetStatusColor;
    let t1;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-2xl font-bold text-gray-900",
                    children: "Module Agents"
                }, void 0, false, {
                    fileName: "[project]/src/app/admin/agents/page.tsx",
                    lineNumber: 137,
                    columnNumber: 15
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-gray-600 mt-1",
                    children: "Configure and manage AI agents for each module"
                }, void 0, false, {
                    fileName: "[project]/src/app/admin/agents/page.tsx",
                    lineNumber: 137,
                    columnNumber: 82
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 137,
            columnNumber: 10
        }, this);
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    let t2;
    if ($[3] !== agents) {
        t2 = agents.filter(_AgentsPageAgentsFilter);
        $[3] = agents;
        $[4] = t2;
    } else {
        t2 = $[4];
    }
    let t3;
    if ($[5] !== t2.length) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-2xl font-bold text-gray-900",
            children: t2.length
        }, void 0, false, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 152,
            columnNumber: 10
        }, this);
        $[5] = t2.length;
        $[6] = t3;
    } else {
        t3 = $[6];
    }
    let t4;
    if ($[7] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-sm text-gray-600",
            children: "Active Agents"
        }, void 0, false, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 160,
            columnNumber: 10
        }, this);
        $[7] = t4;
    } else {
        t4 = $[7];
    }
    let t5;
    if ($[8] !== t3) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white rounded-xl p-4 shadow-md border-2 border-gray-100",
            children: [
                t3,
                t4
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 167,
            columnNumber: 10
        }, this);
        $[8] = t3;
        $[9] = t5;
    } else {
        t5 = $[9];
    }
    let t6;
    if ($[10] !== agents) {
        t6 = agents.reduce(_AgentsPageAgentsReduce, 0).toLocaleString();
        $[10] = agents;
        $[11] = t6;
    } else {
        t6 = $[11];
    }
    let t7;
    if ($[12] !== t6) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-2xl font-bold text-gray-900",
            children: t6
        }, void 0, false, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 183,
            columnNumber: 10
        }, this);
        $[12] = t6;
        $[13] = t7;
    } else {
        t7 = $[13];
    }
    let t8;
    if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-sm text-gray-600",
            children: "Total Messages"
        }, void 0, false, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 191,
            columnNumber: 10
        }, this);
        $[14] = t8;
    } else {
        t8 = $[14];
    }
    let t9;
    if ($[15] !== t7) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white rounded-xl p-4 shadow-md border-2 border-gray-100",
            children: [
                t7,
                t8
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 198,
            columnNumber: 10
        }, this);
        $[15] = t7;
        $[16] = t9;
    } else {
        t9 = $[16];
    }
    const t10 = agents.reduce(_AgentsPageAgentsReduce2, 0) / agents.length;
    let t11;
    if ($[17] !== t10) {
        t11 = t10.toFixed(1);
        $[17] = t10;
        $[18] = t11;
    } else {
        t11 = $[18];
    }
    let t12;
    if ($[19] !== t11) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-2xl font-bold text-gray-900",
            children: [
                t11,
                "%"
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 215,
            columnNumber: 11
        }, this);
        $[19] = t11;
        $[20] = t12;
    } else {
        t12 = $[20];
    }
    let t13;
    if ($[21] === Symbol.for("react.memo_cache_sentinel")) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-sm text-gray-600",
            children: "Avg Accuracy"
        }, void 0, false, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 223,
            columnNumber: 11
        }, this);
        $[21] = t13;
    } else {
        t13 = $[21];
    }
    let t14;
    if ($[22] !== t12) {
        t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white rounded-xl p-4 shadow-md border-2 border-gray-100",
            children: [
                t12,
                t13
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 230,
            columnNumber: 11
        }, this);
        $[22] = t12;
        $[23] = t14;
    } else {
        t14 = $[23];
    }
    let t15;
    if ($[24] !== agents) {
        t15 = agents.filter(_AgentsPageAgentsFilter2);
        $[24] = agents;
        $[25] = t15;
    } else {
        t15 = $[25];
    }
    let t16;
    if ($[26] !== t15.length) {
        t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-2xl font-bold text-gray-900",
            children: t15.length
        }, void 0, false, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 246,
            columnNumber: 11
        }, this);
        $[26] = t15.length;
        $[27] = t16;
    } else {
        t16 = $[27];
    }
    let t17;
    if ($[28] === Symbol.for("react.memo_cache_sentinel")) {
        t17 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-sm text-gray-600",
            children: "In Training"
        }, void 0, false, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 254,
            columnNumber: 11
        }, this);
        $[28] = t17;
    } else {
        t17 = $[28];
    }
    let t18;
    if ($[29] !== t16) {
        t18 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white rounded-xl p-4 shadow-md border-2 border-gray-100",
            children: [
                t16,
                t17
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 261,
            columnNumber: 11
        }, this);
        $[29] = t16;
        $[30] = t18;
    } else {
        t18 = $[30];
    }
    let t19;
    if ($[31] !== t14 || $[32] !== t18 || $[33] !== t5 || $[34] !== t9) {
        t19 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 md:grid-cols-4 gap-4",
            children: [
                t5,
                t9,
                t14,
                t18
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 269,
            columnNumber: 11
        }, this);
        $[31] = t14;
        $[32] = t18;
        $[33] = t5;
        $[34] = t9;
        $[35] = t19;
    } else {
        t19 = $[35];
    }
    let t20;
    if ($[36] !== agents) {
        let t21;
        if ($[38] === Symbol.for("react.memo_cache_sentinel")) {
            t21 = ({
                "AgentsPage[agents.map()]": (agent)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        href: `/admin/agents/${agent.id}`,
                        className: "block bg-white rounded-xl overflow-hidden shadow-md border-2 border-gray-100 hover:border-[#059211] hover:shadow-lg transition-all group",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `bg-gradient-to-r ${agent.color} p-6 text-white`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between mb-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-5xl",
                                                children: agent.icon
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/agents/page.tsx",
                                                lineNumber: 283,
                                                columnNumber: 373
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: `px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`,
                                                children: agent.status
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/agents/page.tsx",
                                                lineNumber: 283,
                                                columnNumber: 419
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/agents/page.tsx",
                                        lineNumber: 283,
                                        columnNumber: 317
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-lg font-bold",
                                        children: agent.name
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/agents/page.tsx",
                                        lineNumber: 283,
                                        columnNumber: 541
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-white/80 mt-1",
                                        children: [
                                            "Module: ",
                                            agent.module
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/agents/page.tsx",
                                        lineNumber: 283,
                                        columnNumber: 592
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/agents/page.tsx",
                                lineNumber: 283,
                                columnNumber: 251
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-6 space-y-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between mb-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-sm text-gray-600",
                                                        children: "Accuracy"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/agents/page.tsx",
                                                        lineNumber: 283,
                                                        columnNumber: 758
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-lg font-bold text-gray-900",
                                                        children: [
                                                            agent.accuracy,
                                                            "%"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/admin/agents/page.tsx",
                                                        lineNumber: 283,
                                                        columnNumber: 813
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/agents/page.tsx",
                                                lineNumber: 283,
                                                columnNumber: 702
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "h-2 bg-gray-200 rounded-full overflow-hidden",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "h-full bg-gradient-to-r from-[#059211] to-[#047a0e]",
                                                    style: {
                                                        width: `${agent.accuracy}%`
                                                    }
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/agents/page.tsx",
                                                    lineNumber: 283,
                                                    columnNumber: 955
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/agents/page.tsx",
                                                lineNumber: 283,
                                                columnNumber: 893
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/agents/page.tsx",
                                        lineNumber: 283,
                                        columnNumber: 697
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-2 gap-4 pt-4 border-t border-gray-100",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-sm text-gray-600 mb-1",
                                                        children: "Messages"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/agents/page.tsx",
                                                        lineNumber: 285,
                                                        columnNumber: 109
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-bold text-gray-900",
                                                        children: agent.messagesHandled.toLocaleString()
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/agents/page.tsx",
                                                        lineNumber: 285,
                                                        columnNumber: 167
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/agents/page.tsx",
                                                lineNumber: 285,
                                                columnNumber: 104
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-sm text-gray-600 mb-1",
                                                        children: "Model"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/agents/page.tsx",
                                                        lineNumber: 285,
                                                        columnNumber: 265
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "font-mono text-xs text-gray-700",
                                                        children: agent.model
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/agents/page.tsx",
                                                        lineNumber: 285,
                                                        columnNumber: 320
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/agents/page.tsx",
                                                lineNumber: 285,
                                                columnNumber: 260
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/agents/page.tsx",
                                        lineNumber: 285,
                                        columnNumber: 34
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex gap-2 pt-4 border-t border-gray-100",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"], {
                                                        size: 16
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/agents/page.tsx",
                                                        lineNumber: 285,
                                                        columnNumber: 612
                                                    }, this),
                                                    "Train"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/agents/page.tsx",
                                                lineNumber: 285,
                                                columnNumber: 458
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
                                                        size: 16
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/agents/page.tsx",
                                                        lineNumber: 285,
                                                        columnNumber: 844
                                                    }, this),
                                                    "Configure"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/agents/page.tsx",
                                                lineNumber: 285,
                                                columnNumber: 650
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/agents/page.tsx",
                                        lineNumber: 285,
                                        columnNumber: 400
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/agents/page.tsx",
                                lineNumber: 283,
                                columnNumber: 666
                            }, this)
                        ]
                    }, agent.id, true, {
                        fileName: "[project]/src/app/admin/agents/page.tsx",
                        lineNumber: 283,
                        columnNumber: 46
                    }, this)
            })["AgentsPage[agents.map()]"];
            $[38] = t21;
        } else {
            t21 = $[38];
        }
        t20 = agents.map(t21);
        $[36] = agents;
        $[37] = t20;
    } else {
        t20 = $[37];
    }
    let t21;
    if ($[39] !== t20) {
        t21 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
            children: t20
        }, void 0, false, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 299,
            columnNumber: 11
        }, this);
        $[39] = t20;
        $[40] = t21;
    } else {
        t21 = $[40];
    }
    let t22;
    if ($[41] !== t19 || $[42] !== t21) {
        t22 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-6",
            children: [
                t1,
                t19,
                t21
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/admin/agents/page.tsx",
            lineNumber: 307,
            columnNumber: 11
        }, this);
        $[41] = t19;
        $[42] = t21;
        $[43] = t22;
    } else {
        t22 = $[43];
    }
    return t22;
}
_s(AgentsPage, "wwWPkQI+kIQUT3QOhiFoScGD0gI=");
_c = AgentsPage;
function _AgentsPageAgentsFilter2(a_2) {
    return a_2.status === "training";
}
function _AgentsPageAgentsReduce2(sum_0, a_1) {
    return sum_0 + a_1.accuracy;
}
function _AgentsPageAgentsReduce(sum, a_0) {
    return sum + a_0.messagesHandled;
}
function _AgentsPageAgentsFilter(a) {
    return a.status === "active";
}
function _AgentsPageGetStatusColor(status) {
    switch(status){
        case "active":
            {
                return "text-green-600 bg-green-100";
            }
        case "training":
            {
                return "text-yellow-600 bg-yellow-100";
            }
        case "inactive":
            {
                return "text-red-600 bg-red-100";
            }
        default:
            {
                return "text-gray-600 bg-gray-100";
            }
    }
}
var _c;
__turbopack_context__.k.register(_c, "AgentsPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * @license lucide-react v0.548.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ __turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>TrendingUp
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "M16 7h6v6",
            key: "box55l"
        }
    ],
    [
        "path",
        {
            d: "m22 7-8.5 8.5-5-5L2 17",
            key: "1t1m79"
        }
    ]
];
const TrendingUp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("trending-up", __iconNode);
;
 //# sourceMappingURL=trending-up.js.map
}),
"[project]/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-client] (ecmascript) <export default as TrendingUp>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TrendingUp",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=_806dc04c._.js.map