(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/map/PlacesAutocomplete.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PlacesAutocomplete
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/map-pin.js [app-client] (ecmascript) <export default as MapPin>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
const getMapsApi = ()=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return window.google?.maps;
};
function PlacesAutocomplete({ onPlaceSelect, placeholder = "Search for a location..." }) {
    _s();
    const [input, setInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [predictions, setPredictions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showDropdown, setShowDropdown] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const autocompleteService = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const geocoder = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const sessionToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Initialize services when Google Maps is loaded
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PlacesAutocomplete.useEffect": ()=>{
            const initServices = {
                "PlacesAutocomplete.useEffect.initServices": ()=>{
                    const maps = getMapsApi();
                    if (maps?.places) {
                        autocompleteService.current = new maps.places.AutocompleteService();
                        geocoder.current = new maps.Geocoder();
                        sessionToken.current = new maps.places.AutocompleteSessionToken();
                    }
                }
            }["PlacesAutocomplete.useEffect.initServices"];
            // Check if Google Maps is already loaded
            if (getMapsApi()) {
                initServices();
            } else {
                // Wait for Google Maps to load
                const checkInterval = setInterval({
                    "PlacesAutocomplete.useEffect.checkInterval": ()=>{
                        if (getMapsApi()) {
                            initServices();
                            clearInterval(checkInterval);
                        }
                    }
                }["PlacesAutocomplete.useEffect.checkInterval"], 100);
                return ({
                    "PlacesAutocomplete.useEffect": ()=>clearInterval(checkInterval)
                })["PlacesAutocomplete.useEffect"];
            }
        }
    }["PlacesAutocomplete.useEffect"], []);
    // Fetch predictions when input changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PlacesAutocomplete.useEffect": ()=>{
            const maps_0 = getMapsApi();
            if (!input.trim() || !autocompleteService.current || !maps_0?.places) {
                setPredictions([]);
                setShowDropdown(false);
                return;
            }
            setIsLoading(true);
            // Debounce to avoid excessive API calls
            const timer = setTimeout({
                "PlacesAutocomplete.useEffect.timer": ()=>{
                    // Create location bias for Nashik area (prioritize Nashik results)
                    if (!maps_0.places) {
                        setIsLoading(false);
                        return;
                    }
                    const places = maps_0.places;
                    if (!sessionToken.current) {
                        sessionToken.current = new places.AutocompleteSessionToken();
                    }
                    const activeToken = sessionToken.current;
                    if (!activeToken) {
                        setIsLoading(false);
                        return;
                    }
                    const nashikBounds = new maps_0.LatLngBounds(new maps_0.LatLng(19.85, 73.60), // Southwest corner
                    new maps_0.LatLng(20.20, 74.00) // Northeast corner
                    );
                    autocompleteService.current.getPlacePredictions({
                        input: input,
                        sessionToken: activeToken,
                        componentRestrictions: {
                            country: 'in'
                        },
                        // Restrict to India
                        types: [
                            'geocode',
                            'establishment'
                        ],
                        // Include addresses and places
                        locationBias: nashikBounds // Bias results to Nashik area
                    }, {
                        "PlacesAutocomplete.useEffect.timer": (results, status)=>{
                            setIsLoading(false);
                            if (status === places.PlacesServiceStatus.OK && results) {
                                // Filter to only show results that mention Nashik, Maharashtra or nearby areas
                                const filteredResults = results.filter({
                                    "PlacesAutocomplete.useEffect.timer.filteredResults": (result)=>{
                                        const desc = result.description.toLowerCase();
                                        return desc.includes('nashik') || desc.includes('maharashtra') || desc.includes('nashik district');
                                    }
                                }["PlacesAutocomplete.useEffect.timer.filteredResults"]);
                                // If no Nashik results, show top 5 Maharashtra results as fallback
                                const finalResults = filteredResults.length > 0 ? filteredResults : results.filter({
                                    "PlacesAutocomplete.useEffect.timer": (r)=>r.description.toLowerCase().includes('maharashtra')
                                }["PlacesAutocomplete.useEffect.timer"]).slice(0, 5);
                                setPredictions(finalResults);
                                setShowDropdown(finalResults.length > 0);
                            } else {
                                setPredictions([]);
                                setShowDropdown(false);
                            }
                        }
                    }["PlacesAutocomplete.useEffect.timer"]);
                }
            }["PlacesAutocomplete.useEffect.timer"], 300); // 300ms debounce
            return ({
                "PlacesAutocomplete.useEffect": ()=>clearTimeout(timer)
            })["PlacesAutocomplete.useEffect"];
        }
    }["PlacesAutocomplete.useEffect"], [
        input
    ]);
    // Handle place selection
    const handleSelectPlace = async (placeId, description)=>{
        const maps_1 = getMapsApi();
        if (!geocoder.current || !maps_1) return;
        setInput(description);
        setShowDropdown(false);
        setIsLoading(true);
        try {
            // Get place details (coordinates and address components)
            const result_0 = await geocoder.current.geocode({
                placeId
            });
            const place = result_0?.results?.[0];
            const location = place?.geometry?.location;
            if (place && location) {
                // Extract address components
                let locality = '';
                let city = '';
                let pincode = '';
                place.address_components.forEach((component)=>{
                    const types = component.types;
                    if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
                        locality = component.long_name;
                    }
                    if (types.includes('locality')) {
                        city = component.long_name;
                    }
                    if (types.includes('postal_code')) {
                        pincode = component.long_name;
                    }
                });
                // Call the callback with place data
                onPlaceSelect({
                    lat: location.lat(),
                    lng: location.lng(),
                    address: place.formatted_address,
                    locality,
                    city,
                    pincode
                });
                // Create new session token for next search
                sessionToken.current = maps_1.places ? new maps_1.places.AutocompleteSessionToken() : null;
            }
        } catch (error) {
            console.error('Error getting place details:', error);
        } finally{
            setIsLoading(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative w-full",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                        className: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
                    }, void 0, false, {
                        fileName: "[project]/src/components/map/PlacesAutocomplete.tsx",
                        lineNumber: 242,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "text",
                        value: input,
                        onChange: (e)=>setInput(e.target.value),
                        placeholder: placeholder,
                        className: "w-full pl-11 pr-11 py-3.5 text-base text-gray-900 placeholder-gray-500 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    }, void 0, false, {
                        fileName: "[project]/src/components/map/PlacesAutocomplete.tsx",
                        lineNumber: 243,
                        columnNumber: 9
                    }, this),
                    isLoading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                        className: "absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600 animate-spin"
                    }, void 0, false, {
                        fileName: "[project]/src/components/map/PlacesAutocomplete.tsx",
                        lineNumber: 244,
                        columnNumber: 23
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/map/PlacesAutocomplete.tsx",
                lineNumber: 241,
                columnNumber: 7
            }, this),
            showDropdown && predictions.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border-2 border-gray-300 max-h-[60vh] overflow-y-auto",
                children: predictions.map((prediction)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>handleSelectPlace(prediction.place_id, prediction.description),
                        className: "w-full px-4 py-4 text-left hover:bg-green-50 active:bg-green-100 transition-colors flex items-start gap-3 border-b-2 border-gray-200 last:border-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__["MapPin"], {
                                className: "w-6 h-6 text-green-600 mt-0.5 flex-shrink-0"
                            }, void 0, false, {
                                fileName: "[project]/src/components/map/PlacesAutocomplete.tsx",
                                lineNumber: 250,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1 min-w-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-base font-bold text-gray-900 mb-1",
                                        children: prediction.structured_formatting.main_text
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/map/PlacesAutocomplete.tsx",
                                        lineNumber: 252,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-gray-600",
                                        children: prediction.structured_formatting.secondary_text
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/map/PlacesAutocomplete.tsx",
                                        lineNumber: 255,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/map/PlacesAutocomplete.tsx",
                                lineNumber: 251,
                                columnNumber: 15
                            }, this)
                        ]
                    }, prediction.place_id, true, {
                        fileName: "[project]/src/components/map/PlacesAutocomplete.tsx",
                        lineNumber: 249,
                        columnNumber: 42
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/map/PlacesAutocomplete.tsx",
                lineNumber: 248,
                columnNumber: 50
            }, this),
            showDropdown && predictions.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute z-50 w-full mt-1 px-2 py-1 text-right",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    src: "https://developers.google.com/static/maps/documentation/images/powered_by_google_on_white.png",
                    alt: "Powered by Google",
                    width: 120,
                    height: 16,
                    className: "h-4 inline-block w-auto"
                }, void 0, false, {
                    fileName: "[project]/src/components/map/PlacesAutocomplete.tsx",
                    lineNumber: 264,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/map/PlacesAutocomplete.tsx",
                lineNumber: 263,
                columnNumber: 50
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/map/PlacesAutocomplete.tsx",
        lineNumber: 239,
        columnNumber: 10
    }, this);
}
_s(PlacesAutocomplete, "GnDazpXGIpibmRe36zMj7OD/2vQ=");
_c = PlacesAutocomplete;
var _c;
__turbopack_context__.k.register(_c, "PlacesAutocomplete");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/map/LocationPicker.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LocationPicker
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/map-pin.js [app-client] (ecmascript) <export default as MapPin>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Navigation$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/navigation.js [app-client] (ecmascript) <export default as Navigation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$map$2f$PlacesAutocomplete$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/map/PlacesAutocomplete.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
const getMapsApi = ()=>{
    if (("TURBOPACK compile-time value", "object") === 'undefined' || !window.google?.maps) {
        return null;
    }
    return window.google.maps;
};
function LocationPicker({ initialLat, initialLng, onLocationConfirm, onCancel }) {
    _s();
    const [position, setPosition] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialLat && initialLng ? {
        lat: initialLat,
        lng: initialLng
    } : null);
    const [address, setAddress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [road, setRoad] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [house, setHouse] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [floor, setFloor] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [contactName, setContactName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [contactNumber, setContactNumber] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [addressType, setAddressType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('Home');
    const [isGeocoding, setIsGeocoding] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isFetchingLocation, setIsFetchingLocation] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [map, setMap] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [marker, setMarker] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [zoneBoundaries, setZoneBoundaries] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isInZone, setIsInZone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const zonesLoadedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    // Fetch zone boundaries from backend
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LocationPicker.useEffect": ()=>{
            if (zonesLoadedRef.current) {
                return;
            }
            zonesLoadedRef.current = true;
            const fetchZones = {
                "LocationPicker.useEffect.fetchZones": async ()=>{
                    try {
                        const response = await fetch('http://localhost:3201/zones/boundaries');
                        const data = await response.json();
                        if (data.success && data.zones) {
                            setZoneBoundaries(data.zones);
                            console.log('✅ Loaded zone boundaries:', data.zones.length);
                            if (!position && data.zones.length > 0 && data.zones[0].center) {
                                const firstZoneCenter = data.zones[0].center;
                                console.log('📍 Using first zone center as default:', firstZoneCenter);
                                setPosition(firstZoneCenter);
                            }
                        }
                    } catch (error) {
                        console.error('Failed to fetch zone boundaries:', error);
                        if (!position) {
                            console.log('📍 Using Nashik city center as fallback');
                            setPosition({
                                lat: 20.0,
                                lng: 73.78
                            });
                        }
                    }
                }
            }["LocationPicker.useEffect.fetchZones"];
            fetchZones();
        }
    }["LocationPicker.useEffect"], [
        position
    ]);
    // Check if point is in any zone polygon (client-side validation)
    const isPointInZone = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "LocationPicker.useCallback[isPointInZone]": (lat, lng)=>{
            for (const zone of zoneBoundaries){
                if (zone.coordinates.length < 3) continue;
                let inside = false;
                const coords = zone.coordinates;
                for(let i = 0, j = coords.length - 1; i < coords.length; j = i++){
                    const xi = coords[i].lng;
                    const yi = coords[i].lat;
                    const xj = coords[j].lng;
                    const yj = coords[j].lat;
                    const intersect = yi > lat !== yj > lat && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi;
                    if (intersect) inside = !inside;
                }
                if (inside) return true;
            }
            return false;
        }
    }["LocationPicker.useCallback[isPointInZone]"], [
        zoneBoundaries
    ]);
    // Update zone status when position changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LocationPicker.useEffect": ()=>{
            if (position && zoneBoundaries.length > 0) {
                const inZone = isPointInZone(position.lat, position.lng);
                setIsInZone(inZone);
                if (!inZone) {
                    console.warn('⚠️ Location outside serviceable zones');
                }
            }
        }
    }["LocationPicker.useEffect"], [
        position,
        zoneBoundaries,
        isPointInZone
    ]);
    // Get current location
    const getCurrentLocation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "LocationPicker.useCallback[getCurrentLocation]": ()=>{
            if (!navigator.geolocation) {
                console.warn('Geolocation not supported, using Nashik as default');
                // Fallback to Nashik city center
                const nashikCenter = {
                    lat: 20.0,
                    lng: 73.78
                };
                setPosition(nashikCenter);
                setIsFetchingLocation(false);
                return;
            }
            setIsFetchingLocation(true);
            navigator.geolocation.getCurrentPosition({
                "LocationPicker.useCallback[getCurrentLocation]": (position_0)=>{
                    const newPos = {
                        lat: position_0.coords.latitude,
                        lng: position_0.coords.longitude
                    };
                    setPosition(newPos);
                    // Move map to new position
                    if (map) {
                        map.setCenter(newPos);
                        map.setZoom(16);
                    }
                    // Move marker
                    if (marker) {
                        marker.setPosition(newPos);
                    }
                    setIsFetchingLocation(false);
                    // Reverse geocode
                    reverseGeocode(newPos.lat, newPos.lng);
                }
            }["LocationPicker.useCallback[getCurrentLocation]"], {
                "LocationPicker.useCallback[getCurrentLocation]": (error_0)=>{
                    console.error('Error getting location:', error_0);
                    console.log('Using Nashik as default location');
                    // Fallback to Nashik city center when GPS fails
                    const nashikCenter_0 = {
                        lat: 20.0,
                        lng: 73.78
                    };
                    setPosition(nashikCenter_0);
                    setIsFetchingLocation(false);
                    // Reverse geocode Nashik location
                    reverseGeocode(nashikCenter_0.lat, nashikCenter_0.lng);
                }
            }["LocationPicker.useCallback[getCurrentLocation]"], {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        }
    }["LocationPicker.useCallback[getCurrentLocation]"], [
        map,
        marker
    ]);
    // Reverse geocode coordinates to address
    const reverseGeocode = async (lat_0, lng_0)=>{
        setIsGeocoding(true);
        const maps = getMapsApi();
        if (!maps) {
            setIsGeocoding(false);
            return;
        }
        try {
            const geocoder = new maps.Geocoder();
            const { results } = await geocoder.geocode({
                location: {
                    lat: lat_0,
                    lng: lng_0
                }
            });
            if (results.length > 0) {
                const place = results[0];
                let streetNumber = '';
                let route = '';
                place.address_components.forEach((component)=>{
                    const componentTypes = component.types;
                    if (componentTypes.includes('street_number')) {
                        streetNumber = component.long_name;
                    }
                    if (componentTypes.includes('route')) {
                        route = component.long_name;
                    }
                });
                setAddress(place.formatted_address);
                if (route) {
                    setRoad(route);
                }
                if (streetNumber) {
                    setHouse(streetNumber);
                }
            }
        } catch (error_1) {
            console.error('Geocoding error:', error_1);
        } finally{
            setIsGeocoding(false);
        }
    };
    // Initialize Google Map
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LocationPicker.useEffect": ()=>{
            if (!position) {
                return;
            }
            const initMap = {
                "LocationPicker.useEffect.initMap": ()=>{
                    const maps_0 = getMapsApi();
                    if (!maps_0) {
                        return;
                    }
                    const mapElement = document.getElementById('location-map');
                    if (!mapElement) {
                        return;
                    }
                    const mapInstance = new maps_0.Map(mapElement, {
                        center: position,
                        zoom: 16,
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                        zoomControl: true,
                        zoomControlOptions: {
                            position: maps_0.ControlPosition.RIGHT_TOP ?? 0
                        }
                    });
                    const markerInstance = new maps_0.Marker({
                        position,
                        map: mapInstance,
                        draggable: true,
                        animation: maps_0.Animation.DROP,
                        icon: {
                            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                        }
                    });
                    markerInstance.addListener('dragend', {
                        "LocationPicker.useEffect.initMap": ()=>{
                            const newPos_0 = markerInstance.getPosition();
                            if (newPos_0) {
                                const lat_1 = newPos_0.lat();
                                const lng_1 = newPos_0.lng();
                                setPosition({
                                    lat: lat_1,
                                    lng: lng_1
                                });
                                reverseGeocode(lat_1, lng_1);
                                const inZone_0 = isPointInZone(lat_1, lng_1);
                                setIsInZone(inZone_0);
                                if (!inZone_0) {
                                    alert('⚠️ This location is outside our service area. Please choose a location within the highlighted zones.');
                                }
                            }
                        }
                    }["LocationPicker.useEffect.initMap"]);
                    setMap(mapInstance);
                    setMarker(markerInstance);
                    if (zoneBoundaries.length > 0) {
                        let polygonsCreated = 0;
                        zoneBoundaries.forEach({
                            "LocationPicker.useEffect.initMap": (zone_0)=>{
                                const polygon = new maps_0.Polygon({
                                    paths: zone_0.coordinates.map({
                                        "LocationPicker.useEffect.initMap": (coord)=>({
                                                lat: coord.lat,
                                                lng: coord.lng
                                            })
                                    }["LocationPicker.useEffect.initMap"]),
                                    strokeColor: '#10b981',
                                    strokeOpacity: 0.8,
                                    strokeWeight: 2,
                                    fillColor: '#10b981',
                                    fillOpacity: 0.15,
                                    map: mapInstance
                                });
                                const infoWindow = new maps_0.InfoWindow({
                                    content: `<div style="padding: 8px;">
              <strong>${zone_0.name}</strong><br>
              <span style="color: #10b981;">✓ Service Available</span>
            </div>`
                                });
                                polygon.addListener('click', {
                                    "LocationPicker.useEffect.initMap": (event)=>{
                                        const latLng = event.latLng;
                                        if (latLng) {
                                            infoWindow.setPosition(latLng);
                                            infoWindow.open(mapInstance);
                                        }
                                    }
                                }["LocationPicker.useEffect.initMap"]);
                                polygonsCreated += 1;
                            }
                        }["LocationPicker.useEffect.initMap"]);
                        console.log(`✅ Drew ${polygonsCreated} zone boundaries on map`);
                    }
                    reverseGeocode(position.lat, position.lng);
                }
            }["LocationPicker.useEffect.initMap"];
            const mapsApi = getMapsApi();
            if (mapsApi) {
                initMap();
                return;
            }
            const existingScript = document.getElementById('google-maps-script');
            if (existingScript) {
                existingScript.addEventListener('load', initMap, {
                    once: true
                });
                return ({
                    "LocationPicker.useEffect": ()=>existingScript.removeEventListener('load', initMap)
                })["LocationPicker.useEffect"];
            }
            const script = document.createElement('script');
            script.id = 'google-maps-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${("TURBOPACK compile-time value", "AIzaSyAy5piEV4luSuRIv61wM3-a2OB1rSMkswM") || 'YOUR_API_KEY'}`;
            script.async = true;
            script.defer = true;
            script.addEventListener('load', initMap, {
                once: true
            });
            document.head.appendChild(script);
            return ({
                "LocationPicker.useEffect": ()=>{
                    script.removeEventListener('load', initMap);
                }
            })["LocationPicker.useEffect"];
        }
    }["LocationPicker.useEffect"], [
        position,
        zoneBoundaries,
        isPointInZone
    ]);
    // Get initial location on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LocationPicker.useEffect": ()=>{
            if (!position) {
                getCurrentLocation();
            }
        }
    }["LocationPicker.useEffect"], [
        getCurrentLocation,
        position
    ]);
    const handleConfirm = ()=>{
        if (!position) {
            alert('Please select a location on the map');
            return;
        }
        if (!address.trim()) {
            alert('Please wait while we fetch the address');
            return;
        }
        // Validate required fields
        if (!contactName.trim()) {
            alert('Please enter contact person name');
            return;
        }
        if (!contactNumber.trim()) {
            alert('Please enter contact phone number');
            return;
        }
        // Validate phone number (basic validation)
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(contactNumber.trim())) {
            alert('Please enter a valid 10-digit mobile number');
            return;
        }
        // Check if location is in serviceable zone
        if (isInZone === false) {
            alert('⚠️ Sorry, we don\'t service this area yet. Please select a location within the highlighted green zones on the map.');
            return;
        }
        onLocationConfirm({
            lat: position.lat,
            lng: position.lng,
            address: address.trim(),
            road: road.trim() || undefined,
            house: house.trim() || undefined,
            floor: floor.trim() || undefined,
            contact_person_name: contactName.trim(),
            contact_person_number: contactNumber.trim(),
            address_type: addressType
        });
    };
    // Handle place selection from autocomplete
    const handlePlaceSelect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "LocationPicker.useCallback[handlePlaceSelect]": (place_0)=>{
            // Update position
            const newPos_1 = {
                lat: place_0.lat,
                lng: place_0.lng
            };
            setPosition(newPos_1);
            // Update address fields
            setAddress(place_0.address);
            // Move map to new position
            if (map) {
                map.setCenter(newPos_1);
                map.setZoom(16);
            }
            // Move marker
            if (marker) {
                marker.setPosition(newPos_1);
            }
            // Trigger reverse geocode to extract road/house details
            reverseGeocode(place_0.lat, place_0.lng);
        }
    }["LocationPicker.useCallback[handlePlaceSelect]"], [
        map,
        marker
    ]);
    if (!position) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white rounded-2xl p-8 max-w-md w-full text-center text-gray-900",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "animate-pulse mb-6",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__["MapPin"], {
                            className: "w-16 h-16 mx-auto text-green-600"
                        }, void 0, false, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 513,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/map/LocationPicker.tsx",
                        lineNumber: 512,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-xl font-bold mb-3 text-gray-900",
                        children: "Getting your location..."
                    }, void 0, false, {
                        fileName: "[project]/src/components/map/LocationPicker.tsx",
                        lineNumber: 515,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-base text-gray-700 mb-6",
                        children: "Please allow location access when prompted"
                    }, void 0, false, {
                        fileName: "[project]/src/components/map/LocationPicker.tsx",
                        lineNumber: 516,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onCancel,
                        className: "w-full px-6 py-4 border-2 border-gray-400 rounded-lg hover:bg-gray-50 active:bg-gray-100 text-base font-bold text-gray-700 transition-colors",
                        children: "Cancel"
                    }, void 0, false, {
                        fileName: "[project]/src/components/map/LocationPicker.tsx",
                        lineNumber: 519,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/map/LocationPicker.tsx",
                lineNumber: 511,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/map/LocationPicker.tsx",
            lineNumber: 510,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-0",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white text-gray-900 w-full h-full sm:rounded-2xl sm:w-full sm:max-w-3xl sm:h-[92vh] flex flex-col shadow-2xl",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "px-4 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white flex items-center justify-between flex-shrink-0 sm:rounded-t-2xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 min-w-0",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-lg sm:text-xl font-bold flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__["MapPin"], {
                                            className: "w-6 h-6 flex-shrink-0"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                                            lineNumber: 531,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Choose Location"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                                            lineNumber: 532,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 530,
                                    columnNumber: 13
                                }, this),
                                zoneBoundaries.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs sm:text-sm text-green-50 mt-1",
                                    children: "🟢 Green areas show serviceable zones"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 534,
                                    columnNumber: 43
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 529,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onCancel,
                            className: "p-3 hover:bg-white/20 rounded-full transition-colors flex-shrink-0 ml-2",
                            "aria-label": "Close",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                className: "w-6 h-6"
                            }, void 0, false, {
                                fileName: "[project]/src/components/map/LocationPicker.tsx",
                                lineNumber: 539,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 538,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                    lineNumber: 528,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-4 border-b bg-gray-50 flex-shrink-0",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$map$2f$PlacesAutocomplete$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            onPlaceSelect: handlePlaceSelect,
                            placeholder: "Search for your location..."
                        }, void 0, false, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 545,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between mt-3 gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm text-gray-700 font-medium flex-1",
                                    children: [
                                        "💡 ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "hidden sm:inline",
                                            children: "Type to search, or drag the pin on the map below"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                                            lineNumber: 548,
                                            columnNumber: 18
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "sm:hidden",
                                            children: "Search or drag pin below"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                                            lineNumber: 549,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 547,
                                    columnNumber: 13
                                }, this),
                                isInZone !== null && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: `text-sm font-bold px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 ${isInZone ? 'bg-green-100 text-green-800 border-2 border-green-400' : 'bg-red-100 text-red-800 border-2 border-red-400'}`,
                                    children: isInZone ? '✓ In Zone' : '✗ Outside'
                                }, void 0, false, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 551,
                                    columnNumber: 35
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 546,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                    lineNumber: 544,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative h-[40vh] sm:h-80 flex-shrink-0 border-b",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            id: "location-map",
                            className: "w-full h-full"
                        }, void 0, false, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 559,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: getCurrentLocation,
                            disabled: isFetchingLocation,
                            className: "absolute bottom-4 left-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white p-4 rounded-full shadow-2xl disabled:opacity-50 transition-all z-10 border-3 border-white",
                            title: "Use my current location",
                            "aria-label": "Get current location",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Navigation$3e$__["Navigation"], {
                                className: `w-7 h-7 ${isFetchingLocation ? 'animate-spin' : ''}`
                            }, void 0, false, {
                                fileName: "[project]/src/components/map/LocationPicker.tsx",
                                lineNumber: 563,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 562,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "hidden sm:block absolute top-3 left-3 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-md text-xs text-gray-800 font-medium",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                    children: "Tip:"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 568,
                                    columnNumber: 13
                                }, this),
                                " Zoom with +/- buttons (top right), drag pin to adjust"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 567,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                    lineNumber: 558,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-4 flex-1 overflow-y-auto bg-white",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-gray-700 font-semibold mb-4 flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-2xl",
                                    children: "📍"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 575,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Drag the pin to adjust location"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 576,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 574,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-base font-bold text-gray-900 mb-2",
                                    children: [
                                        "Address ",
                                        isGeocoding && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-sm text-blue-600 font-normal",
                                            children: "(loading...)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                                            lineNumber: 582,
                                            columnNumber: 39
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 581,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                    value: address,
                                    readOnly: true,
                                    className: "w-full px-4 py-3 text-base text-gray-900 bg-gray-50 border-2 border-gray-300 rounded-lg resize-none",
                                    rows: 3,
                                    placeholder: "Address will appear here..."
                                }, void 0, false, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 584,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 580,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-base font-bold text-gray-900 mb-2",
                                    children: [
                                        "Contact Person Name ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-red-600",
                                            children: "*"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                                            lineNumber: 590,
                                            columnNumber: 35
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 589,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "text",
                                    value: contactName,
                                    onChange: (e)=>setContactName(e.target.value),
                                    className: "w-full px-4 py-3 text-base text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500",
                                    placeholder: "Enter full name",
                                    required: true
                                }, void 0, false, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 592,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 588,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-base font-bold text-gray-900 mb-2",
                                    children: [
                                        "Contact Phone Number ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-red-600",
                                            children: "*"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                                            lineNumber: 597,
                                            columnNumber: 36
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 596,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "tel",
                                    value: contactNumber,
                                    onChange: (e_0)=>setContactNumber(e_0.target.value),
                                    className: "w-full px-4 py-3 text-base text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500",
                                    placeholder: "10-digit mobile number",
                                    inputMode: "numeric",
                                    maxLength: 10,
                                    required: true
                                }, void 0, false, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 599,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 595,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "block text-base font-bold text-gray-900 mb-2",
                                    children: [
                                        "Address Type ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-red-600",
                                            children: "*"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                                            lineNumber: 605,
                                            columnNumber: 28
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 604,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex gap-3",
                                    children: [
                                        'Home',
                                        'Work',
                                        'Other'
                                    ].map((type)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setAddressType(type),
                                            className: `flex-1 px-4 py-3 text-base font-bold rounded-lg border-2 transition-all ${addressType === type ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'}`,
                                            children: [
                                                type === 'Home' && '🏠',
                                                " ",
                                                type === 'Work' && '💼',
                                                " ",
                                                type === 'Other' && '📍',
                                                " ",
                                                type
                                            ]
                                        }, type, true, {
                                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                                            lineNumber: 608,
                                            columnNumber: 54
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 607,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 603,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-2 gap-3 mb-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-base font-bold text-gray-900 mb-2",
                                            children: [
                                                "House/Flat No. ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-gray-600 font-normal",
                                                    children: "(Optional)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                                    lineNumber: 618,
                                                    columnNumber: 32
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                                            lineNumber: 617,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: house,
                                            onChange: (e_1)=>setHouse(e_1.target.value),
                                            className: "w-full px-4 py-3 text-base text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500",
                                            placeholder: "e.g., 123"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                                            lineNumber: 620,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 616,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block text-base font-bold text-gray-900 mb-2",
                                            children: [
                                                "Floor ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-gray-600 font-normal",
                                                    children: "(Optional)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                                    lineNumber: 624,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                                            lineNumber: 623,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: floor,
                                            onChange: (e_2)=>setFloor(e_2.target.value),
                                            className: "w-full px-4 py-3 text-base text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500",
                                            placeholder: "e.g., 2nd"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                                            lineNumber: 626,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 622,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 615,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-sm text-gray-600 bg-gray-100 px-4 py-2.5 rounded-lg font-mono",
                            children: [
                                "📍 ",
                                position.lat.toFixed(6),
                                ", ",
                                position.lng.toFixed(6)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 631,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                    lineNumber: 573,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-4 border-t flex gap-3 flex-shrink-0 bg-white",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onCancel,
                            className: "flex-1 px-6 py-4 text-base font-bold border-2 border-gray-400 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors",
                            children: "Cancel"
                        }, void 0, false, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 638,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: handleConfirm,
                            disabled: isGeocoding || !address,
                            className: "flex-1 px-6 py-4 text-base font-bold bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 active:from-green-800 active:to-green-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg disabled:shadow-none",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                    className: "w-6 h-6"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 642,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Confirm"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                                    lineNumber: 643,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/map/LocationPicker.tsx",
                            lineNumber: 641,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/map/LocationPicker.tsx",
                    lineNumber: 637,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/map/LocationPicker.tsx",
            lineNumber: 526,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/map/LocationPicker.tsx",
        lineNumber: 525,
        columnNumber: 10
    }, this);
}
_s(LocationPicker, "9EywU3mAlIeZd9nle+GTSJh5wIw=");
_c = LocationPicker;
var _c;
__turbopack_context__.k.register(_c, "LocationPicker");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/map/LocationPicker.tsx [app-client] (ecmascript, next/dynamic entry)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/components/map/LocationPicker.tsx [app-client] (ecmascript)"));
}),
"[project]/node_modules/lucide-react/dist/esm/icons/navigation.js [app-client] (ecmascript)", ((__turbopack_context__) => {
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
    ()=>Navigation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "polygon",
        {
            points: "3 11 22 2 13 21 11 13 3 11",
            key: "1ltx0t"
        }
    ]
];
const Navigation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("navigation", __iconNode);
;
 //# sourceMappingURL=navigation.js.map
}),
"[project]/node_modules/lucide-react/dist/esm/icons/navigation.js [app-client] (ecmascript) <export default as Navigation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Navigation",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/navigation.js [app-client] (ecmascript)");
}),
"[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript)", ((__turbopack_context__) => {
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
    ()=>Check
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "M20 6 9 17l-5-5",
            key: "1gmf2c"
        }
    ]
];
const Check = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("check", __iconNode);
;
 //# sourceMappingURL=check.js.map
}),
"[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Check",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript)");
}),
"[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript)", ((__turbopack_context__) => {
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
    ()=>Search
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "m21 21-4.34-4.34",
            key: "14j7rj"
        }
    ],
    [
        "circle",
        {
            cx: "11",
            cy: "11",
            r: "8",
            key: "4ej97u"
        }
    ]
];
const Search = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("search", __iconNode);
;
 //# sourceMappingURL=search.js.map
}),
"[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Search",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=_4a6104db._.js.map