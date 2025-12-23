#!/usr/bin/env python3
"""
NLU Training Data Generator for Mangwale
=========================================

This script generates training data by:
1. Pulling real product/store names from OpenSearch
2. Creating Hindi/Hinglish variations using templates
3. Distinguishing between food orders, grocery orders, and parcels
4. Using IndicBERT embeddings for similarity-based augmentation

Author: Mangwale AI Team
"""

import json
import random
import requests
from typing import List, Dict, Tuple
from pathlib import Path

# OpenSearch configuration
OPENSEARCH_URL = "http://localhost:9200"

# ============================================================================
# TEMPLATES FOR DIFFERENT INTENTS
# ============================================================================

# Food order templates (from restaurants)
FOOD_ORDER_TEMPLATES = [
    # English
    "I want to order {item}",
    "order {item} please",
    "I need {item}",
    "get me {item}",
    "{quantity} {item} please",
    
    # Hindi/Hinglish
    "mujhe {item} chahiye",
    "mujhe {quantity} {item} do",
    "{quantity} {item} bhej do",
    "{item} order karo",
    "{item} lao jaldi",
    "{item} mangwao",
    "mujhe {item} khana hai",
    "{item} chahiye abhi",
    
    # With delivery urgency
    "{item} jaldi bhej do",
    "{item} ghar pe bhej do",
    "{item} deliver karo",
    "abhi {item} chahiye",
    
    # With restaurant
    "{store} se {item} mangwao",
    "{store} se {item} bhej do",
    "{item} {store} se lao",
    
    # Quantity patterns
    "{quantity} plate {item}",
    "{quantity} {item} order karo",
    "ek {item} chahiye",
    "do {item} bhej do",
]

# Grocery order templates (from stores like Kirana, supermarket)
GROCERY_ORDER_TEMPLATES = [
    # English
    "I need {item} from grocery",
    "order {item} from store",
    "get {item} delivered",
    
    # Hindi/Hinglish
    "mujhe {item} chahiye grocery se",
    "{item} mangwao store se",
    "kirana se {item} lao",
    "{quantity} {item} chahiye",
    "{item} home delivery karo",
    "supermarket se {item}",
    "{quantity} packet {item}",
    "{quantity} kg {item}",
    
    # With quantity
    "ek kilo {item}",
    "half kg {item}",
    "{quantity} litre {item}",
]

# Parcel/Courier templates (completely different context)
PARCEL_TEMPLATES = [
    # English
    "I want to send a parcel",
    "book a courier",
    "pickup parcel from my home",
    "send package to {location}",
    "courier booking karo",
    
    # Hindi/Hinglish
    "parcel bhejni hai",
    "courier karna hai",
    "ghar se parcel pickup karo",
    "mujhe ghar se parcel pickup karna hai",
    "mujhe ghar se official parcel pickup karna hai",
    "office se document bhejni hai",
    "packet pickup karwao",
    "saman bhijwana hai",
    "dastavez courier karo",
    "papers bhejne hain",
    "file courier karni hai",
    "parcel book karo urgent",
    "courier service chahiye",
    "delivery booking karo",
    "pickup schedule karo parcel ka",
    "{location} pe parcel bhejni hai",
    "document pickup karo office se",
]

# Hindi numbers for quantity
HINDI_NUMBERS = {
    "ek": "1", "do": "2", "teen": "3", "chaar": "4",
    "paanch": "5", "chhah": "6", "saat": "7", "aath": "8",
    "nau": "9", "das": "10"
}

QUANTITIES = ["1", "2", "3", "4", "5", "6", "ek", "do", "teen", "chaar", "half", "ek kilo"]

LOCATIONS = ["office", "ghar", "dukan", "shop", "Nashik", "Mumbai", "Pune"]

# ============================================================================
# DATA FETCHING FROM OPENSEARCH
# ============================================================================

def fetch_food_items(limit: int = 500) -> List[Dict]:
    """Fetch food items from OpenSearch."""
    try:
        response = requests.post(
            f"{OPENSEARCH_URL}/food_items/_search",
            json={"size": limit, "_source": ["name", "category_name", "store_name"]},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        data = response.json()
        return [hit["_source"] for hit in data.get("hits", {}).get("hits", [])]
    except Exception as e:
        print(f"Error fetching food items: {e}")
        return []

def fetch_grocery_items(limit: int = 500) -> List[Dict]:
    """Fetch grocery/ecom items from OpenSearch."""
    try:
        response = requests.post(
            f"{OPENSEARCH_URL}/ecom_items/_search",
            json={"size": limit, "_source": ["name", "category_name", "store_name"]},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        data = response.json()
        return [hit["_source"] for hit in data.get("hits", {}).get("hits", [])]
    except Exception as e:
        print(f"Error fetching grocery items: {e}")
        return []

def fetch_unique_stores(index: str = "food_items", limit: int = 100) -> List[str]:
    """Fetch unique store names from OpenSearch."""
    try:
        response = requests.post(
            f"{OPENSEARCH_URL}/{index}/_search",
            json={
                "size": 0,
                "aggs": {"stores": {"terms": {"field": "store_name.keyword", "size": limit}}}
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        data = response.json()
        return [b["key"] for b in data.get("aggregations", {}).get("stores", {}).get("buckets", [])]
    except Exception as e:
        print(f"Error fetching stores: {e}")
        return []

def fetch_unique_categories(index: str = "food_items", limit: int = 100) -> List[str]:
    """Fetch unique category names."""
    try:
        response = requests.post(
            f"{OPENSEARCH_URL}/{index}/_search",
            json={
                "size": 0,
                "aggs": {"categories": {"terms": {"field": "category_name.keyword", "size": limit}}}
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        data = response.json()
        return [b["key"] for b in data.get("aggregations", {}).get("categories", {}).get("buckets", [])]
    except Exception as e:
        print(f"Error fetching categories: {e}")
        return []

# ============================================================================
# TRAINING DATA GENERATION
# ============================================================================

def generate_food_order_examples(food_items: List[Dict], stores: List[str], count: int = 200) -> List[Dict]:
    """Generate food order training examples."""
    examples = []
    
    for _ in range(count):
        template = random.choice(FOOD_ORDER_TEMPLATES)
        item = random.choice(food_items) if food_items else {"name": "biryani"}
        item_name = item.get("name", "food")
        store = random.choice(stores) if stores and "{store}" in template else ""
        quantity = random.choice(QUANTITIES)
        
        text = template.format(
            item=item_name,
            store=store,
            quantity=quantity
        )
        
        # Clean up any empty braces
        text = text.replace("  ", " ").strip()
        
        examples.append({
            "text": text,
            "intent": "order_food"
        })
    
    return examples

def generate_grocery_order_examples(grocery_items: List[Dict], count: int = 100) -> List[Dict]:
    """Generate grocery order training examples."""
    examples = []
    
    for _ in range(count):
        template = random.choice(GROCERY_ORDER_TEMPLATES)
        item = random.choice(grocery_items) if grocery_items else {"name": "atta"}
        item_name = item.get("name", "grocery")
        quantity = random.choice(QUANTITIES)
        
        text = template.format(
            item=item_name,
            quantity=quantity
        )
        
        text = text.replace("  ", " ").strip()
        
        examples.append({
            "text": text,
            "intent": "order_grocery"  # New intent for grocery
        })
    
    return examples

def generate_parcel_examples(count: int = 100) -> List[Dict]:
    """Generate parcel/courier training examples."""
    examples = []
    
    for _ in range(count):
        template = random.choice(PARCEL_TEMPLATES)
        location = random.choice(LOCATIONS)
        
        text = template.format(location=location)
        text = text.replace("  ", " ").strip()
        
        examples.append({
            "text": text,
            "intent": "create_parcel_order"
        })
    
    return examples

def generate_hindi_variations(examples: List[Dict]) -> List[Dict]:
    """Add common Hindi misspelling variations."""
    variations = []
    
    misspellings = {
        "ande": ["anndi", "anda", "andi"],
        "egg": ["anda", "ande"],
        "roti": ["rotiya", "chapati", "chapathi"],
        "parcel": ["parsal", "parcle"],
        "courier": ["currier", "kurier"],
        "pizza": ["piza", "pizzaa"],
        "biryani": ["biriyani", "briyani"],
        "official": ["offical", "oficcial"],
    }
    
    for ex in examples:
        text = ex["text"].lower()
        for correct, variants in misspellings.items():
            if correct in text:
                for variant in variants:
                    variations.append({
                        "text": text.replace(correct, variant),
                        "intent": ex["intent"]
                    })
    
    return variations

def add_egg_specific_examples() -> List[Dict]:
    """Add specific egg-related food order examples."""
    egg_patterns = [
        # Common Hindi egg orders
        ("mujhe 6 ande chahiye", "order_food"),
        ("mujhe 6 anndi jaldi ghar pe bhej do", "order_food"),
        ("anda curry bhej do", "order_food"),
        ("egg omelette order karo", "order_food"),
        ("anda bhurji chahiye", "order_food"),
        ("boiled eggs bhej do", "order_food"),
        ("double anda omelette", "order_food"),
        ("ande ki sabzi", "order_food"),
        ("6 eggs bhej do jaldi", "order_food"),
        ("egg fried rice order karo", "order_food"),
        ("half fry anda do", "order_food"),
        ("bread omelette chahiye", "order_food"),
        ("ande wala sandwich", "order_food"),
        
        # Misspellings
        ("mujhe 6 anndi bhej do", "order_food"),
        ("anndi curry chahiye", "order_food"),
        ("andi bhurji order karo", "order_food"),
    ]
    
    return [{"text": text, "intent": intent} for text, intent in egg_patterns]

def add_delivery_disambiguation_examples() -> List[Dict]:
    """Add examples to distinguish food delivery from parcel delivery."""
    examples = [
        # Food delivery with "bhej do" - should be order_food
        ("biryani bhej do ghar pe", "order_food"),
        ("pizza bhej do jaldi", "order_food"),
        ("khana bhej do abhi", "order_food"),
        ("roti sabzi bhej do", "order_food"),
        ("momos bhej do jaldi se", "order_food"),
        ("noodles bhej do ghar", "order_food"),
        ("chai bhej do office", "order_food"),
        ("paneer tikka bhej do", "order_food"),
        ("dal makhani bhej do", "order_food"),
        ("chicken biryani bhej do", "order_food"),
        ("veg thali bhej do", "order_food"),
        ("burger bhej do jaldi", "order_food"),
        ("dosa bhej do ghar pe", "order_food"),
        ("samosa bhej do abhi", "order_food"),
        
        # Parcel/courier - should be create_parcel_order
        ("parcel bhej do", "create_parcel_order"),
        ("courier bhej do", "create_parcel_order"),
        ("document bhej do", "create_parcel_order"),
        ("packet bhej do office", "create_parcel_order"),
        ("saman bhej do", "create_parcel_order"),
        ("papers bhej do", "create_parcel_order"),
        ("file bhej do courier se", "create_parcel_order"),
        ("parcel pickup karo ghar se", "create_parcel_order"),
        ("mujhe parcel bhejni hai", "create_parcel_order"),
        ("courier booking karo", "create_parcel_order"),
    ]
    
    return [{"text": text, "intent": intent} for text, intent in examples]

def add_restaurant_specific_examples(stores: List[str]) -> List[Dict]:
    """Add examples with actual restaurant names."""
    examples = []
    
    food_items = ["biryani", "roti", "pizza", "chicken tikka", "paneer", "dal", "naan", "burger"]
    patterns = [
        "{store} se {item} bhej do",
        "{store} se {item} mangwao",
        "{item} {store} se order karo",
        "mujhe {store} se {item} chahiye",
        "{store} ka {item} bhej do",
    ]
    
    for store in stores[:20]:  # Top 20 stores
        for _ in range(3):  # 3 examples per store
            pattern = random.choice(patterns)
            item = random.choice(food_items)
            text = pattern.format(store=store, item=item)
            examples.append({"text": text, "intent": "order_food"})
    
    return examples

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("=" * 60)
    print("Mangwale NLU Training Data Generator")
    print("=" * 60)
    
    # Fetch data from OpenSearch
    print("\n📦 Fetching data from OpenSearch...")
    food_items = fetch_food_items(500)
    grocery_items = fetch_grocery_items(500)
    stores = fetch_unique_stores()
    food_categories = fetch_unique_categories("food_items")
    grocery_categories = fetch_unique_categories("ecom_items")
    
    print(f"  - Food items: {len(food_items)}")
    print(f"  - Grocery items: {len(grocery_items)}")
    print(f"  - Restaurants: {len(stores)}")
    print(f"  - Food categories: {len(food_categories)}")
    print(f"  - Grocery categories: {len(grocery_categories)}")
    
    # Generate training data
    print("\n🔧 Generating training examples...")
    
    all_examples = []
    
    # Food orders
    food_examples = generate_food_order_examples(food_items, stores, 200)
    all_examples.extend(food_examples)
    print(f"  - Food order examples: {len(food_examples)}")
    
    # Grocery orders (if we want to add this intent)
    # grocery_examples = generate_grocery_order_examples(grocery_items, 100)
    # all_examples.extend(grocery_examples)
    # print(f"  - Grocery order examples: {len(grocery_examples)}")
    
    # Parcel orders
    parcel_examples = generate_parcel_examples(100)
    all_examples.extend(parcel_examples)
    print(f"  - Parcel order examples: {len(parcel_examples)}")
    
    # Egg-specific examples
    egg_examples = add_egg_specific_examples()
    all_examples.extend(egg_examples)
    print(f"  - Egg-specific examples: {len(egg_examples)}")
    
    # Delivery disambiguation
    delivery_examples = add_delivery_disambiguation_examples()
    all_examples.extend(delivery_examples)
    print(f"  - Delivery disambiguation: {len(delivery_examples)}")
    
    # Restaurant-specific examples
    restaurant_examples = add_restaurant_specific_examples(stores)
    all_examples.extend(restaurant_examples)
    print(f"  - Restaurant-specific: {len(restaurant_examples)}")
    
    # Add variations with misspellings
    variations = generate_hindi_variations(all_examples)
    all_examples.extend(variations)
    print(f"  - Misspelling variations: {len(variations)}")
    
    # Remove duplicates
    seen = set()
    unique_examples = []
    for ex in all_examples:
        key = (ex["text"].lower(), ex["intent"])
        if key not in seen:
            seen.add(key)
            unique_examples.append(ex)
    
    print(f"\n✅ Total unique examples: {len(unique_examples)}")
    
    # Count by intent
    intent_counts = {}
    for ex in unique_examples:
        intent = ex["intent"]
        intent_counts[intent] = intent_counts.get(intent, 0) + 1
    
    print("\n📊 Examples by intent:")
    for intent, count in sorted(intent_counts.items()):
        print(f"  - {intent}: {count}")
    
    # Save to file
    output_path = Path(__file__).parent.parent / "training-data" / "generated_nlu_training.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(unique_examples, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Saved to: {output_path}")
    
    # Also generate a merged file with existing training data
    existing_path = Path(__file__).parent.parent / "training-data" / "approved_nlu_training.json"
    if existing_path.exists():
        with open(existing_path, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
        
        # Merge and deduplicate
        all_data = existing_data + unique_examples
        seen = set()
        merged = []
        for ex in all_data:
            key = (ex["text"].lower(), ex["intent"])
            if key not in seen:
                seen.add(key)
                merged.append(ex)
        
        merged_path = Path(__file__).parent.parent / "training-data" / "merged_nlu_training.json"
        with open(merged_path, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)
        
        print(f"📚 Merged with existing data: {len(merged)} total examples")
        print(f"💾 Merged file: {merged_path}")
    
    print("\n✨ Done!")

if __name__ == "__main__":
    main()
