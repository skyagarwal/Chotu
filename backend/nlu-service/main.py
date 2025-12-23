from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os, json, re
from typing import Dict, List, Optional
from transformers import AutoTokenizer, AutoModel, AutoModelForSequenceClassification, AutoModelForTokenClassification
import torch
import torch.nn.functional as F
import numpy as np

# Environment-driven paths
HF_MODEL_NAME = os.environ.get("HF_MODEL_NAME", "ai4bharat/IndicBERTv2-MLM-Back-TLM")
BASE_ENCODER = os.environ.get("BASE_ENCODER")  # e.g., /models/indicbert2_cpt_v1
INTENT_MODEL = os.environ.get("INTENT_MODEL")  # e.g., /models/intent_v1
SLOTS_MODEL  = os.environ.get("SLOTS_MODEL")   # e.g., /models/slots_v1
TONE_MODEL   = os.environ.get("TONE_MODEL")    # e.g., /models/tone_v1

# ======================================================
# TEXT NORMALIZATION FOR HINDI MISSPELLINGS
# Normalize common misspellings to standard forms for better NLU accuracy
# ======================================================
HINDI_NORMALIZATIONS = {
    # Egg variants - normalize to standard form
    r'\banndi\b': 'ande',
    r'\bandi\b': 'ande',
    r'\banda\b': 'anda',
    r'\begg\b': 'egg',
    r'\beggs\b': 'eggs',
    # Food items
    r'\broti\b': 'roti',
    r'\brotiya\b': 'roti',
    r'\bchapati\b': 'roti',
    r'\bchapathi\b': 'roti',
    # Common typos
    r'\boffical\b': 'official',
    r'\bpickp\b': 'pickup',
}

# ======================================================
# FOOD vs PARCEL KEYWORD DETECTION
# Used to override embedding classification when keywords are detected
# ======================================================

# Restaurant-specific items (ready-to-eat, menu items)
RESTAURANT_KEYWORDS = {
    # Prepared dishes
    'pizza', 'burger', 'biryani', 'pulao', 'paneer tikka', 'chicken tikka',
    'dosa', 'idli', 'vada', 'uttapam', 'chole bhature', 'pav bhaji',
    'samosa', 'kachori', 'pakoda', 'momos', 'momo', 'chowmein',
    'fried rice', 'manchurian', 'noodles', 'chilli paneer',
    'butter chicken', 'dal makhani', 'kadhai paneer',
    'thali', 'combo', 'meal', 'special',
    # Restaurant-related words
    'restaurant', 'hotel', 'cafe', 'dhaba',
    'menu', 'order food', 'ready', 'fresh',
    # Ready beverages
    'masala chai', 'filter coffee', 'lassi', 'milkshake', 'shake',
}

# Grocery/raw ingredients (for cooking, kirana items)
GROCERY_KEYWORDS = {
    # Raw ingredients
    'ande', 'anda', 'anndi', 'andi', 'egg', 'eggs', 'dozen',
    'doodh', 'dudh', 'milk', 'litre',
    'bread', 'double roti', 'pav',
    'atta', 'flour', 'maida', 'besan',
    'chawal', 'rice', 'basmati',
    'dal', 'daal', 'chana', 'moong', 'masoor', 'urad',
    'cheeni', 'sugar', 'shakkar', 'gud',
    'namak', 'salt',
    'tel', 'oil', 'sarso', 'sunflower',
    'ghee',
    'dahi', 'curd', 'yogurt',
    'paneer', 'butter', 'makhan', 'cheese',
    # Vegetables (raw)
    'aloo', 'potato', 'pyaz', 'onion', 'tamatar', 'tomato',
    'mirch', 'chilli', 'shimla', 'capsicum',
    'gobhi', 'cauliflower', 'patta gobhi', 'cabbage',
    'gajar', 'carrot', 'matar', 'peas',
    'palak', 'spinach', 'methi', 'bhindi', 'lady finger',
    # Spices
    'haldi', 'turmeric', 'jeera', 'cumin', 'dhania', 'coriander',
    'adrak', 'ginger', 'lahsun', 'garlic', 'masale',
    # Grocery context
    'kirana', 'grocery', 'saman', 'daily needs',
}

# Context phrases that indicate MAKING food (grocery intent)
COOKING_CONTEXT = {
    'banana hai', 'banani hai', 'pakana hai', 'pakani hai',
    'cook karna', 'cooking', 'ghar pe nahi', 'khatam ho gaya',
    'lana hai', 'le ao', 'chahiye cooking ke liye',
}

# Combined food keywords (for backward compatibility)
FOOD_KEYWORDS = RESTAURANT_KEYWORDS | GROCERY_KEYWORDS | {
    'khana', 'nashta', 'lunch', 'dinner', 'breakfast',
    'mangwa', 'mangwao', 'order karo', 'bhej do', 'la do',
    'plate', 'piece', 'bowl', 'serving',
    'chai', 'tea', 'coffee',
}

PARCEL_KEYWORDS = {
    'parcel', 'courier', 'packet', 'package', 'document', 'dastavez',
    'papers', 'file', 'saman bhejwana', 'pickup karna', 'pickup karwana',
    'bhejwana', 'courier service', 'parcel booking', 'courier booking',
    'official parcel', 'office se',
}

def normalize_hindi_text(text: str) -> str:
    """Normalize common Hindi misspellings."""
    normalized = text.lower()
    for pattern, replacement in HINDI_NORMALIZATIONS.items():
        normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)
    return normalized

def detect_food_keywords(text: str) -> bool:
    """Check if text contains food-related keywords."""
    text_lower = text.lower()
    for keyword in FOOD_KEYWORDS:
        if keyword in text_lower:
            return True
    return False

def detect_restaurant_keywords(text: str) -> bool:
    """Check if text contains restaurant-specific (ready-to-eat) keywords."""
    text_lower = text.lower()
    for keyword in RESTAURANT_KEYWORDS:
        if keyword in text_lower:
            return True
    return False

def detect_grocery_keywords(text: str) -> bool:
    """Check if text contains grocery/raw ingredient keywords."""
    text_lower = text.lower()
    for keyword in GROCERY_KEYWORDS:
        if keyword in text_lower:
            return True
    return False

def detect_cooking_context(text: str) -> bool:
    """Check if text indicates making/cooking food (grocery context)."""
    text_lower = text.lower()
    for phrase in COOKING_CONTEXT:
        if phrase in text_lower:
            return True
    return False

def detect_parcel_keywords(text: str) -> bool:
    """Check if text contains parcel-related keywords."""
    text_lower = text.lower()
    for keyword in PARCEL_KEYWORDS:
        if keyword in text_lower:
            return True
    return False

def detect_tracking_keywords(text: str) -> bool:
    """Check if text contains order tracking keywords."""
    tracking_keywords = {'track', 'tracking', 'kahan', 'status', 'pahuncha', 'pahunch gaya', 'kitna time'}
    text_lower = text.lower()
    for keyword in tracking_keywords:
        if keyword in text_lower:
            return True
    return False

# Intents that should NOT be overridden even if keywords present
# These are navigation/general intents that can reasonably contain food words
PROTECTED_INTENTS = {'greeting', 'help', 'goodbye', 'thank_you', 'cancel', 'confirm'}

# Food ordering intents (positive classification)
FOOD_ORDERING_INTENTS = {'order_food', 'find_restaurant', 'restaurant_search', 'menu', 'food_search'}

# Grocery ordering intents
GROCERY_ORDERING_INTENTS = {'order_grocery', 'grocery_order', 'kirana'}

# Parcel ordering intents (positive classification) 
PARCEL_ORDERING_INTENTS = {'create_parcel_order', 'parcel_booking', 'track_parcel'}

# Tracking intents
TRACKING_INTENTS = {'track_order', 'track_parcel', 'order_status'}

def apply_keyword_override(text: str, embed_intent: str, embed_conf: float) -> tuple:
    """
    Override embedding classification based on keyword detection.
    Returns (intent, confidence, was_overridden)
    
    Logic (priority order):
    1. Don't override greeting/help intents
    2. Cooking context + grocery items → order_grocery (making food)
    3. Restaurant items (pizza, biryani, etc.) → order_food
    4. Grocery items without cooking context → could be either (default to order_food for now)
    5. Parcel keywords → create_parcel_order
    6. Tracking keywords → track_order
    """
    has_food = detect_food_keywords(text)
    has_parcel = detect_parcel_keywords(text)
    has_tracking = detect_tracking_keywords(text)
    has_restaurant = detect_restaurant_keywords(text)
    has_grocery = detect_grocery_keywords(text)
    is_cooking = detect_cooking_context(text)
    
    # Don't override greeting/help intents
    if embed_intent in PROTECTED_INTENTS:
        return (embed_intent, embed_conf, False)
    
    # GROCERY: Cooking context with raw ingredients
    # "nashta banana hai ande aur bread mangwa do" → order_grocery
    if is_cooking and has_grocery:
        if embed_intent not in GROCERY_ORDERING_INTENTS:
            return ('order_grocery', max(embed_conf, 0.80), True)
    
    # RESTAURANT: Clear restaurant items (pizza, biryani, momos, etc.)
    # "pizza order karo" → order_food
    if has_restaurant and not is_cooking:
        if embed_intent not in FOOD_ORDERING_INTENTS:
            return ('order_food', max(embed_conf, 0.80), True)
    
    # FOOD (general): Food keywords without clear grocery/restaurant distinction
    # Default to order_food for ambiguous cases
    if has_food and not has_parcel:
        if embed_intent not in FOOD_ORDERING_INTENTS and embed_intent not in GROCERY_ORDERING_INTENTS:
            # If no cooking context and has grocery items, still default to food
            # (Could be "ande mangwa do" = eggs from restaurant as omelette)
            return ('order_food', max(embed_conf, 0.75), True)
    
    # PARCEL: Parcel keywords (only if no food keywords)
    if has_parcel and not has_food:
        if embed_intent not in PARCEL_ORDERING_INTENTS:
            return ('create_parcel_order', max(embed_conf, 0.75), True)
    
    # TRACKING: Tracking keywords (only if no food/parcel keywords)
    if has_tracking and not has_food and not has_parcel:
        if embed_intent not in TRACKING_INTENTS:
            return ('track_order', max(embed_conf, 0.75), True)
    
    return (embed_intent, embed_conf, False)

app = FastAPI(title="nlu-service")

def _try_load_encoder(name_or_path: str):
    try:
        tok = AutoTokenizer.from_pretrained(name_or_path, cache_dir="/hf_cache")
        mdl = AutoModel.from_pretrained(name_or_path, cache_dir="/hf_cache")
        mdl.eval()
        return tok, mdl, name_or_path, True
    except Exception:
        return None, None, name_or_path, False

# Load base encoder (embeddings) with fallback. Do NOT crash if unavailable.
preferred = BASE_ENCODER if (BASE_ENCODER and os.path.isdir(BASE_ENCODER)) else None
encoder_tokenizer, encoder_model, encoder_source, ok = _try_load_encoder(preferred or HF_MODEL_NAME)
if not ok and preferred:
    # fallback to HF if local path failed
    encoder_tokenizer, encoder_model, encoder_source, ok = _try_load_encoder(HF_MODEL_NAME)
if not ok:
    # Degrade gracefully: no encoder, mark source and continue
    encoder_tokenizer, encoder_model, encoder_source = None, None, f"unavailable: {preferred or HF_MODEL_NAME}"

def _load_cls_model(path: Optional[str]):
    # Return gracefully if path missing or empty
    if not path or not os.path.exists(path) or (os.path.isdir(path) and not os.listdir(path)):
        return None, None, None
    try:
        tok = AutoTokenizer.from_pretrained(path, cache_dir="/hf_cache", local_files_only=True)
        model = AutoModelForSequenceClassification.from_pretrained(path, cache_dir="/hf_cache", local_files_only=True)
        id2label = model.config.id2label if hasattr(model.config, 'id2label') else None
        # optional labels.json overrides
        lbl_path = os.path.join(path, 'labels.json')
        if os.path.exists(lbl_path):
            with open(lbl_path, 'r', encoding='utf-8') as f:
                labels = json.load(f)
            id2label = {i: l for i, l in enumerate(labels)}
            model.config.id2label = id2label
            model.config.label2id = {l: i for i, l in id2label.items()}
        model.eval()
        return tok, model, id2label
    except Exception:
        # Model not available locally or invalid; do not crash service
        return None, None, None

def _load_tokcls_model(path: Optional[str]):
    if not path or not os.path.exists(path) or (os.path.isdir(path) and not os.listdir(path)):
        return None, None, None
    try:
        tok = AutoTokenizer.from_pretrained(path, cache_dir="/hf_cache", local_files_only=True)
        model = AutoModelForTokenClassification.from_pretrained(path, cache_dir="/hf_cache", local_files_only=True)
        id2label = model.config.id2label if hasattr(model.config, 'id2label') else None
        lbl_path = os.path.join(path, 'labels.json')
        if os.path.exists(lbl_path):
            with open(lbl_path, 'r', encoding='utf-8') as f:
                labels = json.load(f)
            id2label = {i: l for i, l in enumerate(labels)}
            model.config.id2label = id2label
            model.config.label2id = {l: i for i, l in id2label.items()}
        model.eval()
        return tok, model, id2label
    except Exception:
        return None, None, None

intent_tok, intent_model, intent_id2label = _load_cls_model(INTENT_MODEL)
tone_tok, tone_model, tone_id2label = _load_cls_model(TONE_MODEL)
slots_tok, slots_model, slots_id2label = _load_tokcls_model(SLOTS_MODEL)

# ============================================================================
# EMBEDDING-BASED INTENT CLASSIFICATION (no training required!)
# All 25 intents matching trained model (indicbert_v5_enhanced)
# ============================================================================

# Pre-defined intents with example phrases for Mangwale Food Delivery
INTENT_EXAMPLES = {
    "add_to_cart": [
        "add this to cart", "cart mein daal do", "add pizza to cart",
        "mujhe ye chahiye cart mein", "isko add karo", "cart mein add karo",
        "yeh item cart mein daalo", "add to my cart", "put in cart",
    ],
    "browse_menu": [
        "show menu", "menu dikhao", "what do you have",
        "kya milega yahan", "items dikhao", "browse menu",
        "menu dekho", "kya kya hai", "food options",
    ],
    "cancel_order": [
        "cancel my order", "order cancel karo", "don't want anymore",
        "mujhe nahi chahiye", "cancel karna hai", "refund do",
        "order hatao", "booking cancel", "nahi lena",
    ],
    "checkout": [
        "checkout karo", "proceed to checkout", "payment karo",
        "order place karo", "buy now", "confirm order",
        "payment page", "checkout page", "order karo ab",
    ],
    "chitchat": [
        "how are you", "kya haal hai", "whats up",
        "baat karo", "time pass", "mast hai",
        "badhiya", "sab theek", "aur batao",
    ],
    "complaint": [
        "wrong order", "galat item", "item missing", "food is cold",
        "bad quality", "refund chahiye", "complaint karna hai",
        "khana kharab", "order incomplete", "quantity kam",
    ],
    "contact_search": [
        "find contact", "contact search", "phone number dhundo",
        "mobile number", "address dhundo", "contact details",
    ],
    "create_parcel_order": [
        "parcel order create karo", "new parcel booking", "courier bhejni hai",
        "naya parcel", "package bhejni hai", "courier book karo",
        # Hindi parcel orders - distinct from food delivery
        "mujhe ghar se parcel pickup karna hai", "mujhe ghar se official parcel pickup karna hai",
        "office se parcel lena hai", "parcel pickup karwana hai ghar se",
        "courier bhejwana hai", "document bhejwana hai", "packet pickup karo ghar se",
        "saman bhijwana hai", "parcel delivery book karo", "courier service chahiye",
        "package deliver karwana hai", "mujhe kuch bhejwana hai dusre address pe",
        "parcel book karna hai", "pickup schedule karo parcel ka", "ghar se courier lena hai",
        "office se document pickup", "parcel send karna hai", "courier karna hai urgent",
        "dastavez bhejne hain", "papers courier karo", "file bhejwani hai",
    ],
    "earn": [
        "how to earn", "points kaise milenge", "earn rewards",
        "paisa kamao", "referral bonus", "cashback kaise mile",
    ],
    "greeting": [
        "hello", "hi", "namaste", "hey", "good morning", "good evening",
        "kaise ho", "kya haal", "namaskar", "pranam", "namaste ji",
        "hello ji", "hi kaise ho", "good afternoon", "shubh din",
    ],
    "help": [
        "help me", "madad karo", "problem hai", "issue hai",
        "support chahiye", "kuch galat hai", "help please",
        "customer care", "executive se baat karo", "agent connect karo",
    ],
    "login": [
        "login karna hai", "sign in", "account access", "register",
        "new account", "signup", "password reset", "OTP bhejo",
        "account create karo", "login page", "mera account",
    ],
    "manage_address": [
        "change address", "address update karo", "new address add karo",
        "delivery address", "pata badlo", "location change",
        "address edit karo", "mere addresses", "saved addresses",
    ],
    "order_food": [
        "I want to order food", "khana order karna hai", "order pizza",
        "biryani chahiye", "paneer butter masala", "want to eat",
        "mujhe khana manga hai", "pizza deliver karo", "burger order",
        "show me the menu", "menu dikhao", "kya kya milega",
        "I'm hungry", "bhook lagi hai", "food order karna hai",
        "dosa laga do", "noodles mangwa do", "chinese khana hai",
        "thali lena hai", "veg food chahiye", "non-veg items dikhao",
        "mujhe biryani do", "ek pizza aur garlic bread",
        "dinner order karna hai", "lunch mangwao", "breakfast order",
        # Hindi food orders with delivery pattern
        "6 ande bhej do", "ande chahiye mujhe", "mujhe ande lao",
        "anndi bhej do", "anndi chahiye", "6 anndi bhej do",
        "Mujhe 6 anndi jaldi ghar pe bhej do", "Mujhe 6 ande jaldi ghar pe bhej do",
        "biryani bhej do jaldi", "pizza bhej do ghar pe", "khana bhej do abhi",
        "4 roti bhej do", "roti sabzi bhej do", "dal chawal bhej do",
        "momos bhej do jaldi", "samosa bhej do", "noodles bhej do",
        "anda curry bhej do", "omelette bhej do", "egg bhurji bhej do",
        "inayat cafe se roti bhej do", "restaurant se khana mangwao",
        "hotel raj darbar se biryani bhej do", "X cafe se Y bhej do",
        "mujhe khana chahiye jaldi", "food order karo abhi",
        "ghar pe delivery chahiye khane ki", "khana lao jaldi",
    ],
    "parcel_booking": [
        "send parcel", "book courier", "package bhejni hai",
        "delivery book karo", "parcel pickup", "courier service",
        "parcel bhejni hai", "courier booking", "pickup karo",
    ],
    "play_game": [
        "play game", "game khelo", "spin the wheel",
        "lucky draw", "prize jeeto", "khel shuru karo",
    ],
    "remove_from_cart": [
        "remove from cart", "cart se hatao", "delete from cart",
        "ye nahi chahiye", "item hatao", "remove this",
    ],
    "repeat_order": [
        "repeat my order", "same order again", "wahi order karo",
        "phir se order karo", "last order repeat", "previous order",
    ],
    "search_product": [
        "search for", "show me", "find", "kuch dhundho",
        "restaurants near me", "nearby food", "Chinese food places",
        "pizza shops", "biryani restaurants", "search paneer",
    ],
    "service_inquiry": [
        "kya service hai", "what services", "delivery areas",
        "kahan tak delivery", "timing kya hai", "service details",
    ],
    "thanks": [
        "thank you", "thanks", "dhanyavaad", "shukriya",
        "bahut badhiya", "great service", "accha laga",
    ],
    "track_order": [
        "where is my order", "mera order kahan hai", "track order",
        "order status", "delivery status", "kitna time lagega",
        "rider kahan hai", "abhi tak nahi aaya", "order late",
        "delivery boy location", "ETA kya hai", "when will it arrive",
        "mera parcel kahan pahuncha", "order ko track karo",
        "status check karo", "delivery ka update do",
    ],
    "unknown": [
        "asdfghjkl", "random text", "kjhgfdsa",
    ],
    "use_my_details": [
        "use my saved details", "mere details use karo",
        "saved info use karo", "default address use karo",
        "same details", "pichli details se",
    ],
    "view_cart": [
        "show cart", "cart dikhao", "my cart", "mera cart",
        "cart items", "cart check karo", "what's in cart",
    ],
}

# Pre-compute intent embeddings
intent_embeddings: Dict[str, torch.Tensor] = {}

def _compute_embedding(text: str) -> Optional[torch.Tensor]:
    """Compute embedding for a single text using IndicBERT."""
    if not encoder_model or not encoder_tokenizer:
        return None
    enc = encoder_tokenizer(text, return_tensors="pt", truncation=True, max_length=128, padding=True)
    with torch.no_grad():
        out = encoder_model(**enc)
    # Mean pooling of last hidden state
    return out.last_hidden_state.mean(dim=1).squeeze(0)

def _initialize_intent_embeddings():
    """Pre-compute average embeddings for each intent from examples."""
    global intent_embeddings
    if not encoder_model:
        return
    
    print("Initializing intent embeddings...")
    for intent, examples in INTENT_EXAMPLES.items():
        embeddings = []
        for ex in examples:
            emb = _compute_embedding(ex)
            if emb is not None:
                embeddings.append(emb)
        if embeddings:
            # Average embedding for this intent
            intent_embeddings[intent] = torch.stack(embeddings).mean(dim=0)
            print(f"  {intent}: {len(embeddings)} examples embedded")
    print(f"Intent embeddings initialized for {len(intent_embeddings)} intents")

def _classify_by_embedding(text: str, threshold: float = 0.65) -> tuple[str, float]:
    """
    Classify intent by finding nearest neighbor in embedding space.
    Returns (intent, confidence) where confidence is cosine similarity.
    """
    if not intent_embeddings:
        return "default", 0.0
    
    text_emb = _compute_embedding(text)
    if text_emb is None:
        return "default", 0.0
    
    best_intent = "unknown"
    best_score = 0.0
    
    for intent, intent_emb in intent_embeddings.items():
        # Cosine similarity
        sim = F.cosine_similarity(text_emb.unsqueeze(0), intent_emb.unsqueeze(0)).item()
        if sim > best_score:
            best_score = sim
            best_intent = intent
    
    # Only return if above threshold
    if best_score >= threshold:
        return best_intent, best_score
    return "unknown", best_score

# Initialize embeddings at startup
_initialize_intent_embeddings()

class ParseReq(BaseModel):
    text: str

@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "encoder": encoder_source,
        "encoder_loaded": bool(encoder_model),
        "intent_loaded": bool(intent_model),  # For trained model (if any)
        "intent_embedding_mode": len(intent_embeddings) > 0,  # NEW: embedding-based classification
        "intent_count": len(intent_embeddings),
        "slots_loaded": bool(slots_model),
        "tone_loaded": bool(tone_model),
    }

def softmax_top(logits):
    probs = F.softmax(logits, dim=-1)
    conf, idx = torch.max(probs, dim=-1)
    return conf.item(), idx.item()

def decode_slots(text: str, tokens_enc, pred_ids: List[int], id2label: Dict[int, str]):
    # Map token-level BIO to word-level spans using tokenizer word_ids
    word_ids = tokens_enc.word_ids()
    labels = [id2label.get(i, 'O') for i in pred_ids]
    # Aggregate by words
    word_tags = {}
    for pos, wid in enumerate(word_ids):
        if wid is None:
            continue
        word_tags.setdefault(wid, []).append(labels[pos])
    # Majority tag per word
    words = tokens_enc.tokens()
    per_word = []
    last_wid = None
    for wid, tags in sorted(word_tags.items(), key=lambda x: x[0]):
        # choose first non-O tag if exists
        tag = next((t for t in tags if t != 'O'), 'O')
        per_word.append((wid, tag))
    # Reconstruct slots from BIO
    text_words = text.split()
    slots: Dict[str, str] = {}
    cur_slot, cur_tokens = None, []
    for wid, tag in per_word:
        if wid >= len(text_words):
            continue
        if tag.startswith('B-'):
            if cur_slot and cur_tokens:
                slots[cur_slot] = ' '.join(cur_tokens)
            cur_slot = tag[2:]
            cur_tokens = [text_words[wid]]
        elif tag.startswith('I-') and cur_slot:
            cur_tokens.append(text_words[wid])
        else:
            if cur_slot and cur_tokens:
                slots[cur_slot] = ' '.join(cur_tokens)
            cur_slot, cur_tokens = None, []
    if cur_slot and cur_tokens:
        slots[cur_slot] = ' '.join(cur_tokens)
    return slots

@app.post("/classify")
async def classify(req: ParseReq):
    try:
        result = {}
        original_text = req.text  # Keep original for keyword detection
        # Normalize text for Hindi misspellings
        normalized_text = normalize_hindi_text(req.text)
        
        if encoder_model and encoder_tokenizer:
            enc = encoder_tokenizer(normalized_text, return_tensors="pt", truncation=True, max_length=256)
            with torch.no_grad():
                enc_out = encoder_model(**enc)
            pooled = enc_out.last_hidden_state.mean(dim=1)
            result["embedding"] = pooled[0].tolist()

        # Intent classification - HYBRID: trained model + embedding fallback + keyword override
        trained_intent, trained_conf = None, 0.0
        embedding_intent, embedding_conf = None, 0.0
        
        # Try trained classifier first
        if intent_model and intent_tok:
            x = intent_tok(normalized_text, return_tensors="pt", truncation=True, max_length=128)
            with torch.no_grad():
                out = intent_model(**x)
            trained_conf, idx = softmax_top(out.logits[0])
            trained_intent = intent_id2label.get(idx, str(idx)) if intent_id2label else str(idx)
        
        # Also get embedding-based classification (use normalized text)
        if intent_embeddings:
            embedding_intent, embedding_conf = _classify_by_embedding(normalized_text)
        
        # Choose the best result: prefer trained model if conf > 0.5, else use embedding if conf > 0.65
        # This hybrid approach uses the trained model's domain knowledge but falls back to
        # embedding similarity when the trained model is uncertain
        TRAINED_THRESHOLD = 0.4  # Trained model threshold (low because model has limited data)
        EMBEDDING_THRESHOLD = 0.65  # Embedding threshold
        
        final_intent, final_conf, method = None, 0.0, "none"
        
        if trained_intent and trained_conf >= TRAINED_THRESHOLD:
            final_intent, final_conf, method = trained_intent, trained_conf, "trained"
        elif embedding_intent and embedding_conf >= EMBEDDING_THRESHOLD:
            final_intent, final_conf, method = embedding_intent, embedding_conf, "embedding"
        elif trained_intent and trained_conf > embedding_conf:
            final_intent, final_conf, method = trained_intent, trained_conf, "trained-low"
        elif embedding_intent:
            final_intent, final_conf, method = embedding_intent, embedding_conf, "embedding-low"
        else:
            final_intent, final_conf, method = "default", 0.0, "none"
        
        # Apply keyword-based override for food vs parcel disambiguation
        if final_intent:
            overridden_intent, overridden_conf, was_overridden = apply_keyword_override(
                original_text, final_intent, final_conf
            )
            if was_overridden:
                final_intent = overridden_intent
                final_conf = overridden_conf
                method = f"{method}+keyword-override"
        
        result.update({"intent": final_intent, "intent_conf": float(final_conf), "method": method})

        # Tone (optional)
        if tone_model and tone_tok:
            x = tone_tok(req.text, return_tensors="pt", truncation=True, max_length=128)
            with torch.no_grad():
                out = tone_model(**x)
            conf, idx = softmax_top(out.logits[0])
            label = tone_id2label.get(idx, str(idx)) if tone_id2label else str(idx)
            result.update({"tone": label, "tone_conf": float(conf)})

        # Slots
        if slots_model and slots_tok:
            x = slots_tok(req.text.split(), is_split_into_words=True, return_tensors="pt", truncation=True, max_length=128)
            with torch.no_grad():
                out = slots_model(**x)
            pred_ids = out.logits.argmax(-1)[0].tolist()
            slots = decode_slots(req.text, x, pred_ids, slots_id2label or {})
            result.update({"slots": slots})
        else:
            result.setdefault("slots", {})

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Backward-compat alias
@app.post("/parse")
async def parse(req: ParseReq):
    return await classify(req)

# NEW: Endpoint to add/update intent examples dynamically
class AddIntentReq(BaseModel):
    intent: str
    examples: List[str]
    replace: bool = False  # If true, replace existing examples; else append

@app.post("/add_intent")
async def add_intent(req: AddIntentReq):
    """Add or update intent examples and re-compute embeddings."""
    global intent_embeddings
    
    if req.replace or req.intent not in INTENT_EXAMPLES:
        INTENT_EXAMPLES[req.intent] = req.examples
    else:
        INTENT_EXAMPLES[req.intent].extend(req.examples)
    
    # Recompute embedding for this intent
    embeddings = []
    for ex in INTENT_EXAMPLES[req.intent]:
        emb = _compute_embedding(ex)
        if emb is not None:
            embeddings.append(emb)
    if embeddings:
        intent_embeddings[req.intent] = torch.stack(embeddings).mean(dim=0)
    
    return {
        "status": "ok",
        "intent": req.intent,
        "total_examples": len(INTENT_EXAMPLES[req.intent]),
        "embedded": len(embeddings),
    }

@app.get("/intents")
async def list_intents():
    """List all configured intents and their example counts."""
    return {
        intent: len(examples) 
        for intent, examples in INTENT_EXAMPLES.items()
    }
