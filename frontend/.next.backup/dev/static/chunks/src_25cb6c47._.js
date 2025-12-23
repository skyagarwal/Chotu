(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/CreateDatasetModal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CreateDatasetModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/upload.js [app-client] (ecmascript) <export default as Upload>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-client] (ecmascript) <export default as AlertCircle>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function CreateDatasetModal(t0) {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(82);
    if ($[0] !== "ddb1c5bf19bfd82158233a846008b080d4c2aec280f6168a2fead9eb8cb5aa07") {
        for(let $i = 0; $i < 82; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "ddb1c5bf19bfd82158233a846008b080d4c2aec280f6168a2fead9eb8cb5aa07";
    }
    const { isOpen, onClose, onSubmit } = t0;
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = {
            name: "",
            type: "NLU",
            module: "food",
            description: "",
            file: null
        };
        $[1] = t1;
    } else {
        t1 = $[1];
    }
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(t1);
    const [dragActive, setDragActive] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    if (!isOpen) {
        return null;
    }
    let t2;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = ({
            "CreateDatasetModal[handleDrag]": (e)=>{
                e.preventDefault();
                e.stopPropagation();
                if (e.type === "dragenter" || e.type === "dragover") {
                    setDragActive(true);
                } else {
                    if (e.type === "dragleave") {
                        setDragActive(false);
                    }
                }
            }
        })["CreateDatasetModal[handleDrag]"];
        $[2] = t2;
    } else {
        t2 = $[2];
    }
    const handleDrag = t2;
    let t3;
    if ($[3] !== formData) {
        t3 = ({
            "CreateDatasetModal[handleDrop]": (e_0)=>{
                e_0.preventDefault();
                e_0.stopPropagation();
                setDragActive(false);
                setError("");
                if (e_0.dataTransfer.files && e_0.dataTransfer.files[0]) {
                    const file = e_0.dataTransfer.files[0];
                    if (file.type === "text/csv" || file.type === "application/json" || file.name.endsWith(".csv") || file.name.endsWith(".json")) {
                        setFormData({
                            ...formData,
                            file
                        });
                    } else {
                        setError("Please upload a CSV or JSON file");
                    }
                }
            }
        })["CreateDatasetModal[handleDrop]"];
        $[3] = formData;
        $[4] = t3;
    } else {
        t3 = $[4];
    }
    const handleDrop = t3;
    let t4;
    if ($[5] !== formData) {
        t4 = ({
            "CreateDatasetModal[handleFileChange]": (e_1)=>{
                setError("");
                if (e_1.target.files && e_1.target.files[0]) {
                    const file_0 = e_1.target.files[0];
                    if (file_0.type === "text/csv" || file_0.type === "application/json" || file_0.name.endsWith(".csv") || file_0.name.endsWith(".json")) {
                        setFormData({
                            ...formData,
                            file: file_0
                        });
                    } else {
                        setError("Please upload a CSV or JSON file");
                    }
                }
            }
        })["CreateDatasetModal[handleFileChange]"];
        $[5] = formData;
        $[6] = t4;
    } else {
        t4 = $[6];
    }
    const handleFileChange = t4;
    let t5;
    if ($[7] !== formData || $[8] !== onClose || $[9] !== onSubmit) {
        t5 = ({
            "CreateDatasetModal[handleSubmit]": (e_2)=>{
                e_2.preventDefault();
                if (!formData.name.trim()) {
                    setError("Dataset name is required");
                    return;
                }
                if (!formData.file) {
                    setError("Please upload a dataset file");
                    return;
                }
                onSubmit(formData);
                setFormData({
                    name: "",
                    type: "NLU",
                    module: "food",
                    description: "",
                    file: null
                });
                onClose();
            }
        })["CreateDatasetModal[handleSubmit]"];
        $[7] = formData;
        $[8] = onClose;
        $[9] = onSubmit;
        $[10] = t5;
    } else {
        t5 = $[10];
    }
    const handleSubmit = t5;
    let t6;
    if ($[11] === Symbol.for("react.memo_cache_sentinel")) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
            className: "text-2xl font-bold text-gray-900",
            children: "Create New Dataset"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 155,
            columnNumber: 10
        }, this);
        $[11] = t6;
    } else {
        t6 = $[11];
    }
    let t7;
    if ($[12] === Symbol.for("react.memo_cache_sentinel")) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
            size: 24
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 162,
            columnNumber: 10
        }, this);
        $[12] = t7;
    } else {
        t7 = $[12];
    }
    let t8;
    if ($[13] !== onClose) {
        t8 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-between p-6 border-b border-gray-200",
            children: [
                t6,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: onClose,
                    className: "p-2 hover:bg-gray-100 rounded-lg transition-colors",
                    children: t7
                }, void 0, false, {
                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                    lineNumber: 169,
                    columnNumber: 94
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 169,
            columnNumber: 10
        }, this);
        $[13] = onClose;
        $[14] = t8;
    } else {
        t8 = $[14];
    }
    let t9;
    if ($[15] !== error) {
        t9 = error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                    size: 20
                }, void 0, false, {
                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                    lineNumber: 177,
                    columnNumber: 120
                }, this),
                error
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 177,
            columnNumber: 19
        }, this);
        $[15] = error;
        $[16] = t9;
    } else {
        t9 = $[16];
    }
    let t10;
    if ($[17] === Symbol.for("react.memo_cache_sentinel")) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium text-gray-700 mb-2",
            children: "Dataset Name *"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 185,
            columnNumber: 11
        }, this);
        $[17] = t10;
    } else {
        t10 = $[17];
    }
    let t11;
    if ($[18] !== formData) {
        t11 = ({
            "CreateDatasetModal[<input>.onChange]": (e_3)=>setFormData({
                    ...formData,
                    name: e_3.target.value
                })
        })["CreateDatasetModal[<input>.onChange]"];
        $[18] = formData;
        $[19] = t11;
    } else {
        t11 = $[19];
    }
    let t12;
    if ($[20] !== formData.name || $[21] !== t11) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t10,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    value: formData.name,
                    onChange: t11,
                    placeholder: "e.g., Food NLU v3",
                    className: "w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none",
                    required: true
                }, void 0, false, {
                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                    lineNumber: 205,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 205,
            columnNumber: 11
        }, this);
        $[20] = formData.name;
        $[21] = t11;
        $[22] = t12;
    } else {
        t12 = $[22];
    }
    let t13;
    if ($[23] === Symbol.for("react.memo_cache_sentinel")) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium text-gray-700 mb-2",
            children: "Type *"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 214,
            columnNumber: 11
        }, this);
        $[23] = t13;
    } else {
        t13 = $[23];
    }
    let t14;
    if ($[24] !== formData) {
        t14 = ({
            "CreateDatasetModal[<select>.onChange]": (e_4)=>setFormData({
                    ...formData,
                    type: e_4.target.value
                })
        })["CreateDatasetModal[<select>.onChange]"];
        $[24] = formData;
        $[25] = t14;
    } else {
        t14 = $[25];
    }
    let t15;
    let t16;
    let t17;
    if ($[26] === Symbol.for("react.memo_cache_sentinel")) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "NLU",
            children: "NLU (Intent Classification)"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 236,
            columnNumber: 11
        }, this);
        t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "ASR",
            children: "ASR (Speech Recognition)"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 237,
            columnNumber: 11
        }, this);
        t17 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "TTS",
            children: "TTS (Text-to-Speech)"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 238,
            columnNumber: 11
        }, this);
        $[26] = t15;
        $[27] = t16;
        $[28] = t17;
    } else {
        t15 = $[26];
        t16 = $[27];
        t17 = $[28];
    }
    let t18;
    if ($[29] !== formData.type || $[30] !== t14) {
        t18 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t13,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                    value: formData.type,
                    onChange: t14,
                    className: "w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none",
                    children: [
                        t15,
                        t16,
                        t17
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                    lineNumber: 249,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 249,
            columnNumber: 11
        }, this);
        $[29] = formData.type;
        $[30] = t14;
        $[31] = t18;
    } else {
        t18 = $[31];
    }
    let t19;
    if ($[32] === Symbol.for("react.memo_cache_sentinel")) {
        t19 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium text-gray-700 mb-2",
            children: "Module *"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 258,
            columnNumber: 11
        }, this);
        $[32] = t19;
    } else {
        t19 = $[32];
    }
    let t20;
    if ($[33] !== formData) {
        t20 = ({
            "CreateDatasetModal[<select>.onChange]": (e_5)=>setFormData({
                    ...formData,
                    module: e_5.target.value
                })
        })["CreateDatasetModal[<select>.onChange]"];
        $[33] = formData;
        $[34] = t20;
    } else {
        t20 = $[34];
    }
    let t21;
    let t22;
    let t23;
    let t24;
    let t25;
    let t26;
    let t27;
    let t28;
    let t29;
    if ($[35] === Symbol.for("react.memo_cache_sentinel")) {
        t21 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "food",
            children: "Food"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 286,
            columnNumber: 11
        }, this);
        t22 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "ecom",
            children: "E-Commerce"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 287,
            columnNumber: 11
        }, this);
        t23 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "parcel",
            children: "Parcel Delivery"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 288,
            columnNumber: 11
        }, this);
        t24 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "ride",
            children: "Ride Booking"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 289,
            columnNumber: 11
        }, this);
        t25 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "health",
            children: "Health Services"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 290,
            columnNumber: 11
        }, this);
        t26 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "rooms",
            children: "Room Booking"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 291,
            columnNumber: 11
        }, this);
        t27 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "movies",
            children: "Movies"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 292,
            columnNumber: 11
        }, this);
        t28 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "services",
            children: "Services"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 293,
            columnNumber: 11
        }, this);
        t29 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "payment",
            children: "Payment"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 294,
            columnNumber: 11
        }, this);
        $[35] = t21;
        $[36] = t22;
        $[37] = t23;
        $[38] = t24;
        $[39] = t25;
        $[40] = t26;
        $[41] = t27;
        $[42] = t28;
        $[43] = t29;
    } else {
        t21 = $[35];
        t22 = $[36];
        t23 = $[37];
        t24 = $[38];
        t25 = $[39];
        t26 = $[40];
        t27 = $[41];
        t28 = $[42];
        t29 = $[43];
    }
    let t30;
    if ($[44] !== formData.module || $[45] !== t20) {
        t30 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t19,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                    value: formData.module,
                    onChange: t20,
                    className: "w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none",
                    children: [
                        t21,
                        t22,
                        t23,
                        t24,
                        t25,
                        t26,
                        t27,
                        t28,
                        t29
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                    lineNumber: 317,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 317,
            columnNumber: 11
        }, this);
        $[44] = formData.module;
        $[45] = t20;
        $[46] = t30;
    } else {
        t30 = $[46];
    }
    let t31;
    if ($[47] !== t18 || $[48] !== t30) {
        t31 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-2 gap-4",
            children: [
                t18,
                t30
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 326,
            columnNumber: 11
        }, this);
        $[47] = t18;
        $[48] = t30;
        $[49] = t31;
    } else {
        t31 = $[49];
    }
    let t32;
    if ($[50] === Symbol.for("react.memo_cache_sentinel")) {
        t32 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium text-gray-700 mb-2",
            children: "Description"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 335,
            columnNumber: 11
        }, this);
        $[50] = t32;
    } else {
        t32 = $[50];
    }
    let t33;
    if ($[51] !== formData) {
        t33 = ({
            "CreateDatasetModal[<textarea>.onChange]": (e_6)=>setFormData({
                    ...formData,
                    description: e_6.target.value
                })
        })["CreateDatasetModal[<textarea>.onChange]"];
        $[51] = formData;
        $[52] = t33;
    } else {
        t33 = $[52];
    }
    let t34;
    if ($[53] !== formData.description || $[54] !== t33) {
        t34 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t32,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                    value: formData.description,
                    onChange: t33,
                    placeholder: "Brief description of this dataset...",
                    rows: 3,
                    className: "w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#059211] focus:outline-none resize-none"
                }, void 0, false, {
                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                    lineNumber: 355,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 355,
            columnNumber: 11
        }, this);
        $[53] = formData.description;
        $[54] = t33;
        $[55] = t34;
    } else {
        t34 = $[55];
    }
    let t35;
    if ($[56] === Symbol.for("react.memo_cache_sentinel")) {
        t35 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium text-gray-700 mb-2",
            children: "Upload Dataset File *"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 364,
            columnNumber: 11
        }, this);
        $[56] = t35;
    } else {
        t35 = $[56];
    }
    const t36 = `border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive ? "border-[#059211] bg-green-50" : "border-gray-300 hover:border-gray-400"}`;
    let t37;
    if ($[57] !== formData || $[58] !== handleFileChange) {
        t37 = formData.file ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center gap-3",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                    className: "text-[#059211]",
                    size: 32
                }, void 0, false, {
                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                    lineNumber: 372,
                    columnNumber: 83
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-left",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "font-medium text-gray-900",
                            children: formData.file.name
                        }, void 0, false, {
                            fileName: "[project]/src/components/CreateDatasetModal.tsx",
                            lineNumber: 372,
                            columnNumber: 159
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-sm text-gray-500",
                            children: [
                                (formData.file.size / 1024).toFixed(2),
                                " KB"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/CreateDatasetModal.tsx",
                            lineNumber: 372,
                            columnNumber: 228
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                    lineNumber: 372,
                    columnNumber: 132
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    type: "button",
                    onClick: {
                        "CreateDatasetModal[<button>.onClick]": ()=>setFormData({
                                ...formData,
                                file: null
                            })
                    }["CreateDatasetModal[<button>.onClick]"],
                    className: "ml-4 p-2 hover:bg-gray-100 rounded-lg",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                        size: 20
                    }, void 0, false, {
                        fileName: "[project]/src/components/CreateDatasetModal.tsx",
                        lineNumber: 377,
                        columnNumber: 100
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                    lineNumber: 372,
                    columnNumber: 322
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 372,
            columnNumber: 27
        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {
                    className: "mx-auto text-gray-400 mb-4",
                    size: 48
                }, void 0, false, {
                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                    lineNumber: 377,
                    columnNumber: 135
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-gray-700 mb-2",
                    children: [
                        "Drag and drop your file here, or",
                        " ",
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "text-[#059211] hover:text-[#047a0e] cursor-pointer font-medium",
                            children: [
                                "browse",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "file",
                                    accept: ".csv,.json",
                                    onChange: handleFileChange,
                                    className: "hidden"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                                    lineNumber: 377,
                                    columnNumber: 355
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/CreateDatasetModal.tsx",
                            lineNumber: 377,
                            columnNumber: 267
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                    lineNumber: 377,
                    columnNumber: 194
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-sm text-gray-500",
                    children: "Supported formats: CSV, JSON"
                }, void 0, false, {
                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                    lineNumber: 377,
                    columnNumber: 457
                }, this)
            ]
        }, void 0, true);
        $[57] = formData;
        $[58] = handleFileChange;
        $[59] = t37;
    } else {
        t37 = $[59];
    }
    let t38;
    if ($[60] !== handleDrop || $[61] !== t36 || $[62] !== t37) {
        t38 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t35,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    onDragEnter: handleDrag,
                    onDragLeave: handleDrag,
                    onDragOver: handleDrag,
                    onDrop: handleDrop,
                    className: t36,
                    children: t37
                }, void 0, false, {
                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                    lineNumber: 386,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 386,
            columnNumber: 11
        }, this);
        $[60] = handleDrop;
        $[61] = t36;
        $[62] = t37;
        $[63] = t38;
    } else {
        t38 = $[63];
    }
    let t39;
    if ($[64] === Symbol.for("react.memo_cache_sentinel")) {
        t39 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
            className: "font-medium text-blue-900 mb-2",
            children: "Expected File Format:"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 396,
            columnNumber: 11
        }, this);
        $[64] = t39;
    } else {
        t39 = $[64];
    }
    let t40;
    if ($[65] === Symbol.for("react.memo_cache_sentinel")) {
        t40 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-blue-50 border border-blue-200 rounded-lg p-4",
            children: [
                t39,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-sm text-blue-700 space-y-1",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                    children: "CSV:"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                                    lineNumber: 403,
                                    columnNumber: 134
                                }, this),
                                " text, intent, entities (JSON string)"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/CreateDatasetModal.tsx",
                            lineNumber: 403,
                            columnNumber: 131
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                    children: "JSON:"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                                    lineNumber: 403,
                                    columnNumber: 199
                                }, this),
                                " Array of ",
                                "{text, intent, entities}",
                                " ",
                                "objects"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/CreateDatasetModal.tsx",
                            lineNumber: 403,
                            columnNumber: 196
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/CreateDatasetModal.tsx",
                    lineNumber: 403,
                    columnNumber: 82
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 403,
            columnNumber: 11
        }, this);
        $[65] = t40;
    } else {
        t40 = $[65];
    }
    let t41;
    if ($[66] !== onClose) {
        t41 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "button",
            onClick: onClose,
            className: "flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors",
            children: "Cancel"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 410,
            columnNumber: 11
        }, this);
        $[66] = onClose;
        $[67] = t41;
    } else {
        t41 = $[67];
    }
    let t42;
    if ($[68] === Symbol.for("react.memo_cache_sentinel")) {
        t42 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "submit",
            className: "flex-1 px-6 py-3 bg-gradient-to-r from-[#059211] to-[#047a0e] hover:from-[#047a0e] hover:to-[#036809] text-white rounded-lg font-medium transition-all shadow-lg",
            children: "Create Dataset"
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 418,
            columnNumber: 11
        }, this);
        $[68] = t42;
    } else {
        t42 = $[68];
    }
    let t43;
    if ($[69] !== t41) {
        t43 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex gap-3 pt-4",
            children: [
                t41,
                t42
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 425,
            columnNumber: 11
        }, this);
        $[69] = t41;
        $[70] = t43;
    } else {
        t43 = $[70];
    }
    let t44;
    if ($[71] !== handleSubmit || $[72] !== t12 || $[73] !== t31 || $[74] !== t34 || $[75] !== t38 || $[76] !== t43 || $[77] !== t9) {
        t44 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
            onSubmit: handleSubmit,
            className: "p-6 space-y-6",
            children: [
                t9,
                t12,
                t31,
                t34,
                t38,
                t40,
                t43
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 433,
            columnNumber: 11
        }, this);
        $[71] = handleSubmit;
        $[72] = t12;
        $[73] = t31;
        $[74] = t34;
        $[75] = t38;
        $[76] = t43;
        $[77] = t9;
        $[78] = t44;
    } else {
        t44 = $[78];
    }
    let t45;
    if ($[79] !== t44 || $[80] !== t8) {
        t45 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl",
                children: [
                    t8,
                    t44
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/CreateDatasetModal.tsx",
                lineNumber: 447,
                columnNumber: 96
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/CreateDatasetModal.tsx",
            lineNumber: 447,
            columnNumber: 11
        }, this);
        $[79] = t44;
        $[80] = t8;
        $[81] = t45;
    } else {
        t45 = $[81];
    }
    return t45;
}
_s(CreateDatasetModal, "BgNbUEhDqS66xDemAdH5A4VpjXc=");
_c = CreateDatasetModal;
var _c;
__turbopack_context__.k.register(_c, "CreateDatasetModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/api/admin-backend.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// API Client for Admin Backend (Port 8080)
__turbopack_context__.s([
    "adminBackendClient",
    ()=>adminBackendClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const ADMIN_BACKEND_URL = ("TURBOPACK compile-time value", "http://localhost:3002") || 'http://localhost:8080';
class AdminBackendClient {
    baseUrl;
    constructor(){
        this.baseUrl = ADMIN_BACKEND_URL;
    }
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        const response = await fetch(url, {
            ...options,
            headers
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    }
    // NLU Classification
    async classifyIntent(text, context) {
        return this.request('/nlu/classify', {
            method: 'POST',
            body: JSON.stringify({
                text,
                context
            })
        });
    }
    // Agent Management
    async getAgents() {
        return this.request('/agents');
    }
    async getAgent(id) {
        return this.request(`/agents/${id}`);
    }
    async createAgent(data) {
        return this.request('/agents', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    async updateAgent(id, data) {
        return this.request(`/agents/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    async executeAgent(agentId, message, context) {
        return this.request('/agent-execute', {
            method: 'POST',
            body: JSON.stringify({
                agentId,
                message,
                context
            })
        });
    }
    // Training
    async getDatasets() {
        return this.request('/training/datasets');
    }
    async createDataset(data) {
        return this.request('/training/datasets', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    async addExamples(datasetId, examples) {
        await this.request(`/training/datasets/${datasetId}/examples/bulk`, {
            method: 'POST',
            body: JSON.stringify({
                examples
            })
        });
    }
    async startTrainingJob(data) {
        return this.request('/training/jobs', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    async getTrainingJob(jobId) {
        return this.request(`/training/jobs/${jobId}`);
    }
    async getTrainingJobs() {
        return this.request('/training/jobs');
    }
    async pauseTrainingJob(jobId) {
        return this.request(`/training/jobs/${jobId}/pause`, {
            method: 'POST'
        });
    }
    async stopTrainingJob(jobId) {
        return this.request(`/training/jobs/${jobId}/stop`, {
            method: 'POST'
        });
    }
    async getDataset(datasetId) {
        return this.request(`/training/datasets/${datasetId}`);
    }
    async getDatasetExamples(datasetId) {
        return this.request(`/training/datasets/${datasetId}/examples`);
    }
    async deleteDataset(datasetId) {
        await this.request(`/training/datasets/${datasetId}`, {
            method: 'DELETE'
        });
    }
    // Label Studio Integration
    async pushToLabelStudio(datasetId) {
        return this.request(`/training/datasets/${datasetId}/push-labelstudio`, {
            method: 'POST'
        });
    }
    async pullFromLabelStudio(datasetId) {
        return this.request(`/training/datasets/${datasetId}/pull-labelstudio`, {
            method: 'POST'
        });
    }
    async testLabelStudioConnection() {
        return this.request('/settings/labelstudio/test');
    }
    async uploadDataset(file, metadata) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', metadata.name);
        formData.append('type', metadata.type);
        formData.append('module', metadata.module);
        const url = `${this.baseUrl}/training/datasets/upload`;
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
        return response.json();
    }
    // Models
    async getModels() {
        return this.request('/models');
    }
    async createModel(data) {
        return this.request('/models', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    // Flows
    async getFlows() {
        return this.request('/flows');
    }
    async createFlow(data) {
        return this.request('/flows', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    // Metrics
    async getMetrics() {
        return this.request('/metrics');
    }
    // Audit Logs
    async getAuditLogs(filters) {
        const params = new URLSearchParams(filters);
        return this.request(`/audits?${params}`);
    }
}
const adminBackendClient = new AdminBackendClient();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/hooks/useTrainingWebSocket.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useTrainingWebSocket",
    ()=>useTrainingWebSocket
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
function useTrainingWebSocket(options = {}) {
    _s();
    const [isConnected, setIsConnected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [reconnectAttempts, setReconnectAttempts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const wsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const reconnectTimeoutRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const pingIntervalRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const connectRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const optionsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(options);
    // Keep options ref up to date
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useTrainingWebSocket.useEffect": ()=>{
            optionsRef.current = options;
        }
    }["useTrainingWebSocket.useEffect"], [
        options
    ]);
    const connect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useTrainingWebSocket.useCallback[connect]": ()=>{
            // Get WebSocket URL from environment or default
            const backendUrl = ("TURBOPACK compile-time value", "http://localhost:3002") || 'http://localhost:8080';
            const wsUrl = backendUrl.replace(/^http/, 'ws') + '/ws/training';
            console.log('[WebSocket] Connecting to:', wsUrl);
            try {
                const ws = new WebSocket(wsUrl);
                ws.onopen = ({
                    "useTrainingWebSocket.useCallback[connect]": ()=>{
                        console.log('[WebSocket] Connected');
                        setIsConnected(true);
                        setReconnectAttempts(0);
                        optionsRef.current.onConnected?.();
                        // Start ping interval to keep connection alive
                        if (pingIntervalRef.current) {
                            clearInterval(pingIntervalRef.current);
                        }
                        pingIntervalRef.current = setInterval({
                            "useTrainingWebSocket.useCallback[connect]": ()=>{
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.send(JSON.stringify({
                                        type: 'ping'
                                    }));
                                }
                            }
                        }["useTrainingWebSocket.useCallback[connect]"], 30000); // Ping every 30 seconds
                    }
                })["useTrainingWebSocket.useCallback[connect]"];
                ws.onmessage = ({
                    "useTrainingWebSocket.useCallback[connect]": (event)=>{
                        try {
                            const data = JSON.parse(event.data);
                            console.log('[WebSocket] Received:', data.type);
                            switch(data.type){
                                case 'connected':
                                    console.log('[WebSocket] Server confirmed connection');
                                    break;
                                case 'training_update':
                                    optionsRef.current.onJobUpdate?.(data);
                                    break;
                                case 'job_created':
                                    optionsRef.current.onJobCreated?.(data);
                                    break;
                                case 'dataset_update':
                                    optionsRef.current.onDatasetUpdate?.(data);
                                    break;
                                case 'pong':
                                    break;
                                default:
                                    console.log('[WebSocket] Unknown message type:', data);
                            }
                        } catch (error_0) {
                            console.error('[WebSocket] Failed to parse message:', error_0);
                        }
                    }
                })["useTrainingWebSocket.useCallback[connect]"];
                ws.onerror = ({
                    "useTrainingWebSocket.useCallback[connect]": (error_1)=>{
                        console.error('[WebSocket] Error:', error_1);
                        optionsRef.current.onError?.(error_1);
                    }
                })["useTrainingWebSocket.useCallback[connect]"];
                ws.onclose = ({
                    "useTrainingWebSocket.useCallback[connect]": ()=>{
                        console.log('[WebSocket] Disconnected');
                        setIsConnected(false);
                        optionsRef.current.onDisconnected?.();
                        // Clear ping interval
                        if (pingIntervalRef.current) {
                            clearInterval(pingIntervalRef.current);
                            pingIntervalRef.current = null;
                        }
                        // Attempt to reconnect with exponential backoff
                        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                        console.log(`[WebSocket] Reconnecting in ${delay}ms...`);
                        reconnectTimeoutRef.current = setTimeout({
                            "useTrainingWebSocket.useCallback[connect]": ()=>{
                                setReconnectAttempts({
                                    "useTrainingWebSocket.useCallback[connect]": (prev)=>prev + 1
                                }["useTrainingWebSocket.useCallback[connect]"]);
                                if (connectRef.current) {
                                    connectRef.current();
                                }
                            }
                        }["useTrainingWebSocket.useCallback[connect]"], delay);
                    }
                })["useTrainingWebSocket.useCallback[connect]"];
                wsRef.current = ws;
            } catch (error) {
                console.error('[WebSocket] Connection error:', error);
            }
        }
    }["useTrainingWebSocket.useCallback[connect]"], [
        reconnectAttempts
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useTrainingWebSocket.useEffect": ()=>{
            connectRef.current = connect;
        }
    }["useTrainingWebSocket.useEffect"], [
        connect
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useTrainingWebSocket.useEffect": ()=>{
            connect();
            return ({
                "useTrainingWebSocket.useEffect": ()=>{
                    console.log('[WebSocket] Cleanup');
                    // Clear reconnect timeout
                    if (reconnectTimeoutRef.current) {
                        clearTimeout(reconnectTimeoutRef.current);
                    }
                    // Clear ping interval
                    if (pingIntervalRef.current) {
                        clearInterval(pingIntervalRef.current);
                    }
                    // Close WebSocket connection
                    if (wsRef.current) {
                        wsRef.current.close();
                        wsRef.current = null;
                    }
                }
            })["useTrainingWebSocket.useEffect"];
        }
    }["useTrainingWebSocket.useEffect"], [
        connect
    ]);
    return {
        isConnected,
        reconnectAttempts
    };
}
_s(useTrainingWebSocket, "wh0NMWzIriw+OrQT83VHOv06g04=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/admin/training/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TrainingPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/database.js [app-client] (ecmascript) <export default as Database>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$play$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Play$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/play.js [app-client] (ecmascript) <export default as Play>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pause$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Pause$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/pause.js [app-client] (ecmascript) <export default as Pause>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check-big.js [app-client] (ecmascript) <export default as CheckCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-client] (ecmascript) <export default as XCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clock.js [app-client] (ecmascript) <export default as Clock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-client] (ecmascript) <export default as TrendingUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/upload.js [app-client] (ecmascript) <export default as Upload>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/download.js [app-client] (ecmascript) <export default as Download>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye.js [app-client] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wifi$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wifi$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/wifi.js [app-client] (ecmascript) <export default as Wifi>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wifi$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__WifiOff$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/wifi-off.js [app-client] (ecmascript) <export default as WifiOff>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-client] (ecmascript) <export default as RefreshCw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CreateDatasetModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/CreateDatasetModal.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$admin$2d$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api/admin-backend.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTrainingWebSocket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useTrainingWebSocket.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
function TrainingPage() {
    _s();
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('datasets');
    const [isCreateModalOpen, setIsCreateModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [datasets, setDatasets] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [jobs, setJobs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    // WebSocket connection for real-time updates
    const { isConnected } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTrainingWebSocket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTrainingWebSocket"])({
        onJobUpdate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
            "TrainingPage.useTrainingWebSocket.useCallback": (update)=>{
                console.log('[Training Page] Job update:', update);
                setJobs({
                    "TrainingPage.useTrainingWebSocket.useCallback": (prevJobs)=>prevJobs.map({
                            "TrainingPage.useTrainingWebSocket.useCallback": (job)=>job.id === update.jobId ? {
                                    ...job,
                                    status: update.status,
                                    progress: update.progress
                                } : job
                        }["TrainingPage.useTrainingWebSocket.useCallback"])
                }["TrainingPage.useTrainingWebSocket.useCallback"]);
            }
        }["TrainingPage.useTrainingWebSocket.useCallback"], []),
        onJobCreated: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
            "TrainingPage.useTrainingWebSocket.useCallback": (event)=>{
                console.log('[Training Page] New job created:', event.job);
                const newJob = {
                    id: event.job.id,
                    name: `Training Job ${event.job.id}`,
                    dataset: event.job.datasetId || '',
                    type: event.job.kind === 'asr-train' ? 'asr-finetune' : event.job.kind,
                    status: event.job.status,
                    progress: event.job.progress || 0
                };
                setJobs({
                    "TrainingPage.useTrainingWebSocket.useCallback": (prevJobs_0)=>[
                            newJob,
                            ...prevJobs_0
                        ]
                }["TrainingPage.useTrainingWebSocket.useCallback"]);
            }
        }["TrainingPage.useTrainingWebSocket.useCallback"], []),
        onConnected: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
            "TrainingPage.useTrainingWebSocket.useCallback": ()=>{
                console.log('[Training Page] WebSocket connected');
            }
        }["TrainingPage.useTrainingWebSocket.useCallback"], []),
        onDisconnected: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
            "TrainingPage.useTrainingWebSocket.useCallback": ()=>{
                console.log('[Training Page] WebSocket disconnected');
            }
        }["TrainingPage.useTrainingWebSocket.useCallback"], [])
    });
    // Fetch datasets and jobs on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TrainingPage.useEffect": ()=>{
            const loadData = {
                "TrainingPage.useEffect.loadData": async ()=>{
                    try {
                        setLoading(true);
                        setError('');
                        const [datasetsData, jobsData] = await Promise.all([
                            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$admin$2d$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["adminBackendClient"].getDatasets(),
                            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$admin$2d$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["adminBackendClient"].getTrainingJobs()
                        ]);
                        // Map API data to local format
                        const mappedDatasets = datasetsData.map({
                            "TrainingPage.useEffect.loadData.mappedDatasets": (d)=>({
                                    id: d.id,
                                    name: d.name,
                                    type: d.type,
                                    module: d.module || 'unknown',
                                    examples: d.exampleCount || 0,
                                    created: d.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                                    status: 'ready'
                                })
                        }["TrainingPage.useEffect.loadData.mappedDatasets"]);
                        const mappedJobs = jobsData.map({
                            "TrainingPage.useEffect.loadData.mappedJobs": (j)=>({
                                    id: j.id,
                                    name: `Training Job ${j.id}`,
                                    dataset: j.dataset_id,
                                    type: j.type === 'asr-train' ? 'asr-finetune' : j.type,
                                    status: j.status,
                                    progress: j.progress || 0,
                                    accuracy: j.accuracy,
                                    loss: j.loss,
                                    startTime: j.createdAt,
                                    epoch: j.epoch,
                                    totalEpochs: 10 // Default value
                                })
                        }["TrainingPage.useEffect.loadData.mappedJobs"]);
                        setDatasets(mappedDatasets);
                        setJobs(mappedJobs);
                    } catch (err) {
                        console.error('Failed to fetch training data:', err);
                        setError('Failed to load training data. Using sample data.');
                        // Fallback to sample data on error
                        loadSampleData();
                    } finally{
                        setLoading(false);
                    }
                }
            }["TrainingPage.useEffect.loadData"];
            loadData();
        }
    }["TrainingPage.useEffect"], []);
    const loadSampleData = ()=>{
        // Sample data as fallback
        setDatasets([
            {
                id: 'ds_food_v2',
                name: 'Food NLU Dataset v2',
                type: 'nlu',
                module: 'food',
                examples: 2450,
                created: '2025-10-25',
                status: 'ready'
            },
            {
                id: 'ds_ecom_v1',
                name: 'Ecom NLU Dataset v1',
                type: 'nlu',
                module: 'ecom',
                examples: 1820,
                created: '2025-10-24',
                status: 'ready'
            },
            {
                id: 'ds_parcel_v1',
                name: 'Parcel NLU Dataset v1',
                type: 'nlu',
                module: 'parcel',
                examples: 1350,
                created: '2025-10-23',
                status: 'ready'
            },
            {
                id: 'ds_asr_hindi',
                name: 'Hindi ASR Dataset',
                type: 'asr',
                module: 'global',
                examples: 5600,
                created: '2025-10-20',
                status: 'ready'
            }
        ]);
        setJobs([
            {
                id: 'job_001',
                name: 'Food NLU v2 Training',
                type: 'nlu-train',
                status: 'training',
                dataset: 'ds_food_v2',
                progress: 0.65,
                accuracy: 0.89,
                loss: 0.234,
                startTime: '10 minutes ago',
                epoch: 7,
                totalEpochs: 10
            },
            {
                id: 'job_002',
                name: 'Ecom Product Classification',
                type: 'nlu-train',
                status: 'queued',
                dataset: 'ds_ecom_v1',
                progress: 0,
                startTime: 'Not started',
                totalEpochs: 15
            },
            {
                id: 'job_003',
                name: 'Hindi ASR Model Training',
                type: 'asr-finetune',
                status: 'completed',
                dataset: 'ds_asr_hindi',
                progress: 1.0,
                accuracy: 0.96,
                loss: 0.089,
                startTime: '2 hours ago',
                duration: '45 minutes',
                epoch: 20,
                totalEpochs: 20
            },
            {
                id: 'job_004',
                name: 'Parcel Intent Model',
                type: 'nlu-train',
                status: 'failed',
                dataset: 'ds_parcel_v1',
                progress: 0.45,
                accuracy: 0.67,
                loss: 0.543,
                startTime: '1 day ago',
                epoch: 5,
                totalEpochs: 10
            }
        ]);
    };
    const handleCreateDataset = async (data)=>{
        try {
            if (data.file) {
                const newDataset = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$admin$2d$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["adminBackendClient"].uploadDataset(data.file, {
                    name: data.name,
                    type: data.type.toLowerCase(),
                    module: data.module
                });
                // Add default properties for display
                const displayDataset = {
                    id: newDataset.id,
                    name: newDataset.name,
                    type: newDataset.type,
                    module: data.module,
                    examples: 0,
                    created: new Date().toISOString().split('T')[0],
                    status: 'ready'
                };
                setDatasets([
                    ...datasets,
                    displayDataset
                ]);
            }
        } catch (err_0) {
            console.error('Failed to create dataset:', err_0);
            alert('Failed to create dataset. Please try again.');
        }
    };
    const handleDeleteDataset = async (id)=>{
        if (!confirm('Are you sure you want to delete this dataset?')) return;
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$admin$2d$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["adminBackendClient"].deleteDataset(id);
            setDatasets(datasets.filter((d_0)=>d_0.id !== id));
        } catch (err_1) {
            console.error('Failed to delete dataset:', err_1);
            alert('Failed to delete dataset. Please try again.');
        }
    };
    const handlePushToLabelStudio = async (datasetId)=>{
        try {
            const dataset = datasets.find((d_1)=>d_1.id === datasetId);
            if (!dataset) return;
            if (!confirm(`Push "${dataset.name}" (${dataset.examples} examples) to Label Studio?`)) return;
            const result = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$admin$2d$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["adminBackendClient"].pushToLabelStudio(datasetId);
            alert(`✅ Successfully pushed ${result.pushed} examples to Label Studio!\n\nProject ID: ${result.projectId}`);
        } catch (err_2) {
            console.error('Failed to push to Label Studio:', err_2);
            alert('❌ Failed to push to Label Studio. Make sure Label Studio is configured in settings.');
        }
    };
    const handlePullFromLabelStudio = async (datasetId_0)=>{
        try {
            const dataset_0 = datasets.find((d_2)=>d_2.id === datasetId_0);
            if (!dataset_0) return;
            if (!confirm(`Pull annotations from Label Studio for "${dataset_0.name}"?`)) return;
            const result_0 = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$admin$2d$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["adminBackendClient"].pullFromLabelStudio(datasetId_0);
            alert(`✅ Successfully imported ${result_0.imported} annotations from Label Studio!`);
            // Reload datasets to update example count
            const updatedDatasets = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$admin$2d$backend$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["adminBackendClient"].getDatasets();
            const mappedDatasets_0 = updatedDatasets.map((d_3)=>({
                    id: d_3.id,
                    name: d_3.name,
                    type: d_3.type,
                    module: d_3.module || 'unknown',
                    examples: d_3.exampleCount || 0,
                    created: d_3.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                    status: 'ready'
                }));
            setDatasets(mappedDatasets_0);
        } catch (err_3) {
            console.error('Failed to pull from Label Studio:', err_3);
            alert('❌ Failed to pull from Label Studio. Make sure Label Studio is configured in settings.');
        }
    };
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center min-h-screen",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-2xl font-bold text-gray-900 mb-2",
                        children: "Loading..."
                    }, void 0, false, {
                        fileName: "[project]/src/app/admin/training/page.tsx",
                        lineNumber: 274,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-gray-600",
                        children: "Fetching training data..."
                    }, void 0, false, {
                        fileName: "[project]/src/app/admin/training/page.tsx",
                        lineNumber: 275,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/admin/training/page.tsx",
                lineNumber: 273,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/app/admin/training/page.tsx",
            lineNumber: 272,
            columnNumber: 12
        }, this);
    }
    const getStatusColor = (status)=>{
        switch(status){
            case 'completed':
            case 'ready':
                return 'text-green-600 bg-green-100';
            case 'training':
            case 'processing':
                return 'text-blue-600 bg-blue-100';
            case 'queued':
                return 'text-yellow-600 bg-yellow-100';
            case 'failed':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };
    const getStatusIcon = (status_0)=>{
        switch(status_0){
            case 'completed':
            case 'ready':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
                    size: 16
                }, void 0, false, {
                    fileName: "[project]/src/app/admin/training/page.tsx",
                    lineNumber: 299,
                    columnNumber: 16
                }, this);
            case 'training':
            case 'processing':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$play$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Play$3e$__["Play"], {
                    size: 16
                }, void 0, false, {
                    fileName: "[project]/src/app/admin/training/page.tsx",
                    lineNumber: 302,
                    columnNumber: 16
                }, this);
            case 'queued':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"], {
                    size: 16
                }, void 0, false, {
                    fileName: "[project]/src/app/admin/training/page.tsx",
                    lineNumber: 304,
                    columnNumber: 16
                }, this);
            case 'failed':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"], {
                    size: 16
                }, void 0, false, {
                    fileName: "[project]/src/app/admin/training/page.tsx",
                    lineNumber: 306,
                    columnNumber: 16
                }, this);
            default:
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"], {
                    size: 16
                }, void 0, false, {
                    fileName: "[project]/src/app/admin/training/page.tsx",
                    lineNumber: 308,
                    columnNumber: 16
                }, this);
        }
    };
    const getTypeColor = (type)=>{
        switch(type){
            case 'nlu':
            case 'nlu-train':
                return 'bg-purple-100 text-purple-700';
            case 'asr':
            case 'asr-finetune':
                return 'bg-green-100 text-green-700';
            case 'tts':
            case 'tts-train':
                return 'bg-orange-100 text-orange-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6",
        children: [
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2 text-yellow-800",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"], {
                            size: 20
                        }, void 0, false, {
                            fileName: "[project]/src/app/admin/training/page.tsx",
                            lineNumber: 330,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "font-medium",
                            children: error
                        }, void 0, false, {
                            fileName: "[project]/src/app/admin/training/page.tsx",
                            lineNumber: 331,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/admin/training/page.tsx",
                    lineNumber: 329,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/admin/training/page.tsx",
                lineNumber: 328,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "text-2xl font-bold text-gray-900",
                                        children: "Training Dashboard"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 339,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-gray-600 mt-1",
                                        children: "Manage datasets and train AI models"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 340,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 338,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200",
                                children: isConnected ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wifi$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wifi$3e$__["Wifi"], {
                                            size: 16,
                                            className: "text-green-600 animate-pulse"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/training/page.tsx",
                                            lineNumber: 347,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-xs font-medium text-green-600",
                                            children: "Live Updates"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/training/page.tsx",
                                            lineNumber: 348,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wifi$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__WifiOff$3e$__["WifiOff"], {
                                            size: 16,
                                            className: "text-gray-400"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/training/page.tsx",
                                            lineNumber: 350,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-xs font-medium text-gray-500",
                                            children: "Reconnecting..."
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/training/page.tsx",
                                            lineNumber: 351,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true)
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 345,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/admin/training/page.tsx",
                        lineNumber: 337,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 rounded-lg hover:border-[#059211] transition-all",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {
                                        size: 20
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 357,
                                        columnNumber: 13
                                    }, this),
                                    "Upload Dataset"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 356,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setIsCreateModalOpen(true),
                                className: "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                        size: 20
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 361,
                                        columnNumber: 13
                                    }, this),
                                    "Create Dataset"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 360,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/admin/training/page.tsx",
                        lineNumber: 355,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/admin/training/page.tsx",
                lineNumber: 336,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-1 md:grid-cols-4 gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white rounded-xl p-4 shadow-md border-2 border-gray-100",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-2xl font-bold text-gray-900",
                                children: datasets.length
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 370,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-sm text-gray-600",
                                children: "Total Datasets"
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 373,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/admin/training/page.tsx",
                        lineNumber: 369,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white rounded-xl p-4 shadow-md border-2 border-gray-100",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-2xl font-bold text-gray-900",
                                children: jobs.filter((j_0)=>j_0.status === 'training').length
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 376,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-sm text-gray-600",
                                children: "Training Now"
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 379,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/admin/training/page.tsx",
                        lineNumber: 375,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white rounded-xl p-4 shadow-md border-2 border-gray-100",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-2xl font-bold text-gray-900",
                                children: jobs.filter((j_1)=>j_1.status === 'completed').length
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 382,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-sm text-gray-600",
                                children: "Completed Jobs"
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 385,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/admin/training/page.tsx",
                        lineNumber: 381,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white rounded-xl p-4 shadow-md border-2 border-gray-100",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-2xl font-bold text-gray-900",
                                children: datasets.reduce((sum, d_4)=>sum + d_4.examples, 0).toLocaleString()
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 388,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-sm text-gray-600",
                                children: "Total Examples"
                            }, void 0, false, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 391,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/admin/training/page.tsx",
                        lineNumber: 387,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/admin/training/page.tsx",
                lineNumber: 368,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex gap-2 border-b border-gray-200",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setActiveTab('datasets'),
                        className: `px-6 py-3 font-medium transition-all border-b-2 ${activeTab === 'datasets' ? 'text-[#059211] border-[#059211]' : 'text-gray-600 border-transparent hover:text-gray-900'}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"], {
                                    size: 20
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/training/page.tsx",
                                    lineNumber: 399,
                                    columnNumber: 13
                                }, this),
                                "Datasets (",
                                datasets.length,
                                ")"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/admin/training/page.tsx",
                            lineNumber: 398,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/admin/training/page.tsx",
                        lineNumber: 397,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setActiveTab('jobs'),
                        className: `px-6 py-3 font-medium transition-all border-b-2 ${activeTab === 'jobs' ? 'text-[#059211] border-[#059211]' : 'text-gray-600 border-transparent hover:text-gray-900'}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"], {
                                    size: 20
                                }, void 0, false, {
                                    fileName: "[project]/src/app/admin/training/page.tsx",
                                    lineNumber: 405,
                                    columnNumber: 13
                                }, this),
                                "Training Jobs (",
                                jobs.length,
                                ")"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/admin/training/page.tsx",
                            lineNumber: 404,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/admin/training/page.tsx",
                        lineNumber: 403,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/admin/training/page.tsx",
                lineNumber: 396,
                columnNumber: 7
            }, this),
            activeTab === 'datasets' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-4",
                children: datasets.map((dataset_1)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-start justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-3 mb-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "text-lg font-bold text-gray-900",
                                                        children: dataset_1.name
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                                        lineNumber: 417,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `px-2 py-1 rounded-lg text-xs font-medium ${getTypeColor(dataset_1.type)}`,
                                                        children: dataset_1.type.toUpperCase()
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                                        lineNumber: 420,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${getStatusColor(dataset_1.status)}`,
                                                        children: [
                                                            getStatusIcon(dataset_1.status),
                                                            dataset_1.status
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                                        lineNumber: 423,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 416,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-4 text-sm text-gray-600",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "Module: ",
                                                            dataset_1.module
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                                        lineNumber: 429,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "•"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                                        lineNumber: 430,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            dataset_1.examples.toLocaleString(),
                                                            " examples"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                                        lineNumber: 431,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: "•"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                                        lineNumber: 432,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "Created: ",
                                                            dataset_1.created
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                                        lineNumber: 433,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 428,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 415,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "p-2 hover:bg-gray-100 rounded-lg transition-colors",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                                                    size: 18,
                                                    className: "text-gray-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/training/page.tsx",
                                                    lineNumber: 438,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 437,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "p-2 hover:bg-gray-100 rounded-lg transition-colors",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$download$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Download$3e$__["Download"], {
                                                    size: 18,
                                                    className: "text-gray-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/training/page.tsx",
                                                    lineNumber: 441,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 440,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>handleDeleteDataset(dataset_1.id),
                                                className: "p-2 hover:bg-red-50 rounded-lg transition-colors",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                    size: 18,
                                                    className: "text-red-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/admin/training/page.tsx",
                                                    lineNumber: 444,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 443,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 436,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 414,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-3 mt-4 pt-4 border-t border-gray-100",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        href: `/admin/training/datasets/${dataset_1.id}`,
                                        className: "flex-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium text-center",
                                        children: "View Examples"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 451,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>handlePushToLabelStudio(dataset_1.id),
                                        className: "px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2",
                                        title: "Push to Label Studio for annotation",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$upload$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Upload$3e$__["Upload"], {
                                                size: 16
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 455,
                                                columnNumber: 19
                                            }, this),
                                            "Push to LS"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 454,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>handlePullFromLabelStudio(dataset_1.id),
                                        className: "px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-2",
                                        title: "Pull annotations from Label Studio",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                                size: 16
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 459,
                                                columnNumber: 19
                                            }, this),
                                            "Pull from LS"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 458,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: "flex-1 px-4 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium",
                                        children: "Start Training"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 462,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 450,
                                columnNumber: 15
                            }, this)
                        ]
                    }, dataset_1.id, true, {
                        fileName: "[project]/src/app/admin/training/page.tsx",
                        lineNumber: 413,
                        columnNumber: 38
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/app/admin/training/page.tsx",
                lineNumber: 412,
                columnNumber: 36
            }, this),
            activeTab === 'jobs' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-4",
                children: jobs.map((job_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white rounded-xl p-6 shadow-md border-2 border-gray-100 hover:border-[#059211] transition-all",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-start justify-between mb-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-3 mb-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "text-lg font-bold text-gray-900",
                                                        children: job_0.name
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                                        lineNumber: 475,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `px-2 py-1 rounded-lg text-xs font-medium ${getTypeColor(job_0.type)}`,
                                                        children: job_0.type.toUpperCase()
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                                        lineNumber: 478,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${getStatusColor(job_0.status)}`,
                                                        children: [
                                                            getStatusIcon(job_0.status),
                                                            job_0.status
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                                        lineNumber: 481,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 474,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-4 text-sm text-gray-600",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            "Dataset: ",
                                                            job_0.dataset
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                                        lineNumber: 487,
                                                        columnNumber: 21
                                                    }, this),
                                                    job_0.startTime && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                children: "•"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                                lineNumber: 489,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                children: [
                                                                    "Started: ",
                                                                    job_0.startTime
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                                lineNumber: 490,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true),
                                                    job_0.duration && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                children: "•"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                                lineNumber: 493,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                children: [
                                                                    "Duration: ",
                                                                    job_0.duration
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                                lineNumber: 494,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 486,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 473,
                                        columnNumber: 17
                                    }, this),
                                    job_0.status === 'training' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: "p-2 hover:bg-gray-100 rounded-lg transition-colors",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pause$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Pause$3e$__["Pause"], {
                                            size: 18,
                                            className: "text-gray-600"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/training/page.tsx",
                                            lineNumber: 499,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 498,
                                        columnNumber: 49
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 472,
                                columnNumber: 15
                            }, this),
                            job_0.status !== 'queued' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between mb-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sm font-medium text-gray-700",
                                                children: [
                                                    "Progress: ",
                                                    Math.round(job_0.progress * 100),
                                                    "%",
                                                    job_0.epoch && job_0.totalEpochs && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-gray-500 ml-2",
                                                        children: [
                                                            "(Epoch ",
                                                            job_0.epoch,
                                                            "/",
                                                            job_0.totalEpochs,
                                                            ")"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                                        lineNumber: 508,
                                                        columnNumber: 60
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 506,
                                                columnNumber: 21
                                            }, this),
                                            job_0.accuracy && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sm font-medium text-green-600",
                                                children: [
                                                    "Accuracy: ",
                                                    (job_0.accuracy * 100).toFixed(1),
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 512,
                                                columnNumber: 40
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 505,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "h-3 bg-gray-200 rounded-full overflow-hidden",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: `h-full transition-all ${job_0.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : job_0.status === 'failed' ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-[#059211] to-[#047a0e]'}`,
                                            style: {
                                                width: `${job_0.progress * 100}%`
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/admin/training/page.tsx",
                                            lineNumber: 517,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 516,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 504,
                                columnNumber: 45
                            }, this),
                            (job_0.accuracy !== undefined || job_0.loss !== undefined) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 gap-4 mb-4",
                                children: [
                                    job_0.accuracy !== undefined && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-green-50 rounded-lg p-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-xs text-green-600 mb-1",
                                                children: "Accuracy"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 526,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-2xl font-bold text-green-700",
                                                children: [
                                                    (job_0.accuracy * 100).toFixed(1),
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 529,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 525,
                                        columnNumber: 52
                                    }, this),
                                    job_0.loss !== undefined && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-blue-50 rounded-lg p-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-xs text-blue-600 mb-1",
                                                children: "Loss"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 534,
                                                columnNumber: 23
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-2xl font-bold text-blue-700",
                                                children: job_0.loss.toFixed(3)
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/admin/training/page.tsx",
                                                lineNumber: 535,
                                                columnNumber: 23
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 533,
                                        columnNumber: 48
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 524,
                                columnNumber: 78
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-3 pt-4 border-t border-gray-100",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        href: `/admin/training/jobs/${job_0.id}`,
                                        className: "flex-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium text-center",
                                        children: "View Details"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 543,
                                        columnNumber: 17
                                    }, this),
                                    job_0.status === 'completed' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: "flex-1 px-4 py-2 bg-gradient-to-r from-[#059211] to-[#047a0e] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium",
                                        children: "Deploy Model"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 546,
                                        columnNumber: 50
                                    }, this),
                                    job_0.status === 'failed' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        className: "flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium",
                                        children: "Retry Training"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/admin/training/page.tsx",
                                        lineNumber: 549,
                                        columnNumber: 47
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/admin/training/page.tsx",
                                lineNumber: 542,
                                columnNumber: 15
                            }, this)
                        ]
                    }, job_0.id, true, {
                        fileName: "[project]/src/app/admin/training/page.tsx",
                        lineNumber: 471,
                        columnNumber: 30
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/app/admin/training/page.tsx",
                lineNumber: 470,
                columnNumber: 32
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CreateDatasetModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                isOpen: isCreateModalOpen,
                onClose: ()=>setIsCreateModalOpen(false),
                onSubmit: handleCreateDataset
            }, void 0, false, {
                fileName: "[project]/src/app/admin/training/page.tsx",
                lineNumber: 557,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/admin/training/page.tsx",
        lineNumber: 326,
        columnNumber: 10
    }, this);
}
_s(TrainingPage, "i1x2a3aEDDVq3OUgY6kJ2kuotIs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useTrainingWebSocket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTrainingWebSocket"]
    ];
});
_c = TrainingPage;
var _c;
__turbopack_context__.k.register(_c, "TrainingPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_25cb6c47._.js.map