#!/usr/bin/env python3
"""
Enhanced NLU main.py with food keyword detection
This file patches the existing main.py to improve food vs parcel classification
"""

# Add this to the HINDI_NORMALIZATIONS dictionary:
ENHANCED_NORMALIZATIONS = {
    # Egg variants - normalize to food-specific term
    r'\banndi\b': 'ande food',
    r'\bandi\b': 'ande food',
    r'\banda\b': 'anda food',
    r'\begg\b': 'egg food',
    r'\beggs\b': 'eggs food',
    r'\bande\b': 'ande food',
    
    # Food items - add food context
    r'\broti\b': 'roti food',
    r'\brotiya\b': 'roti food',
    r'\bchapati\b': 'chapati food',
    r'\bbiryani\b': 'biryani food',
    r'\bpizza\b': 'pizza food',
    r'\bpaneer\b': 'paneer food',
    r'\bmomos\b': 'momos food',
    r'\bsamosa\b': 'samosa food',
    r'\bdosa\b': 'dosa food',
    r'\bnoodles\b': 'noodles food',
    r'\bburger\b': 'burger food',
    r'\bthali\b': 'thali food',
    r'\bkhana\b': 'khana food',
    r'\bomelette\b': 'omelette food',
    r'\bbhurji\b': 'bhurji food',
    
    # Common typos
    r'\boffical\b': 'official',
    r'\bpickp\b': 'pickup',
}

# Food detection keywords - if any of these are present, boost order_food
FOOD_KEYWORDS = {
    # English food items
    'pizza', 'burger', 'biryani', 'paneer', 'chicken', 'roti', 'naan', 'dosa',
    'samosa', 'momos', 'noodles', 'rice', 'dal', 'curry', 'thali', 'paratha',
    'omelette', 'sandwich', 'soup', 'salad', 'pasta', 'manchurian', 'tikka',
    'kebab', 'roll', 'wrap', 'fry', 'bhaji', 'bhurji', 'masala',
    
    # Hindi food items
    'khana', 'nashta', 'lunch', 'dinner', 'breakfast',
    'ande', 'anda', 'anndi', 'egg', 'eggs',
    'sabzi', 'chawal', 'daal', 'mithai', 'halwa',
    
    # Restaurant-related
    'restaurant', 'hotel', 'cafe', 'dhaba', 'kitchen',
    'menu', 'order food', 'food order',
    
    # Quantities with food context
    'plate', 'piece', 'bowl', 'serving',
}

# Parcel detection keywords - if these are present without food keywords, boost parcel
PARCEL_KEYWORDS = {
    'parcel', 'courier', 'packet', 'package', 'document', 'dastavez',
    'papers', 'file', 'saman', 'pickup', 'deliver karwana',
    'bhejwana', 'courier service', 'parcel booking',
}

def detect_food_context(text: str) -> bool:
    """Check if text contains food-related keywords."""
    text_lower = text.lower()
    for keyword in FOOD_KEYWORDS:
        if keyword in text_lower:
            return True
    return False

def detect_parcel_context(text: str) -> bool:
    """Check if text contains parcel-related keywords."""
    text_lower = text.lower()
    for keyword in PARCEL_KEYWORDS:
        if keyword in text_lower:
            return True
    return False

def enhanced_classification(text: str, embedding_result: tuple) -> tuple:
    """
    Enhance classification by combining embedding similarity with keyword detection.
    Returns (intent, confidence)
    """
    embed_intent, embed_conf = embedding_result
    
    has_food = detect_food_context(text)
    has_parcel = detect_parcel_context(text)
    
    # If embedding says parcel but we detect food keywords, override
    if embed_intent == 'create_parcel_order' and has_food and not has_parcel:
        return ('order_food', embed_conf * 0.9)  # Slightly lower confidence for override
    
    # If embedding says food but we detect parcel keywords, override  
    if embed_intent == 'order_food' and has_parcel and not has_food:
        return ('create_parcel_order', embed_conf * 0.9)
    
    return (embed_intent, embed_conf)

# To add to the /classify endpoint after embedding classification:
# result_intent, result_conf = enhanced_classification(original_text, (intent, conf))
