#!/usr/bin/env python3
"""
Comprehensive NLU Training Script for Mangwale
===============================================
This script generates extensive training data from OpenSearch indices
and trains the NLU service for high-confidence intent classification.

Key Features:
1. Uses OpenSearch embeddings (768-dim food, 384-dim ecom)
2. Generates context-aware training (restaurant vs grocery)
3. Creates training for: intent, slots, tone, language
4. Distinguishes between:
   - order_food: Ready-to-eat from restaurants
   - order_grocery: Raw ingredients from stores
   - track_order: Order tracking
   - create_parcel_order: Parcel/courier booking

Context Understanding:
- "nashta banana hai, ande aur bread order karo" → order_grocery (making food)
- "ek chai aur bread order karo" → order_food (menu items from restaurant)
"""

import requests
import json
import random
import time
from typing import List, Dict, Tuple
from dataclasses import dataclass
from collections import defaultdict

# Configuration
OPENSEARCH_URL = "http://localhost:9200"
NLU_URL = "http://localhost:7010"

@dataclass
class TrainingExample:
    text: str
    intent: str
    slots: Dict[str, str] = None
    tone: str = None
    language: str = None
    confidence_hint: float = 1.0  # Higher = more important example

class OpenSearchDataLoader:
    """Load products and stores from OpenSearch"""
    
    def __init__(self, base_url: str = OPENSEARCH_URL):
        self.base_url = base_url
        self.food_items = []
        self.grocery_items = []
        self.food_stores = []
        self.grocery_stores = []
        self.food_categories = []
        self.grocery_categories = []
        
    def search(self, index: str, query: dict, size: int = 1000) -> List[dict]:
        """Execute OpenSearch query"""
        try:
            response = requests.post(
                f"{self.base_url}/{index}/_search",
                json={"size": size, "query": query},
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            if response.status_code == 200:
                return [hit["_source"] for hit in response.json().get("hits", {}).get("hits", [])]
        except Exception as e:
            print(f"Error searching {index}: {e}")
        return []
    
    def load_all(self):
        """Load all data from OpenSearch"""
        print("Loading data from OpenSearch...")
        
        # Load food items (restaurants)
        print("  Loading food items...")
        self.food_items = self.search("food_items", {"match_all": {}}, 5000)
        print(f"    Found {len(self.food_items)} food items")
        
        # Load grocery items
        print("  Loading grocery items...")
        self.grocery_items = self.search("ecom_items", {"match_all": {}}, 3000)
        print(f"    Found {len(self.grocery_items)} grocery items")
        
        # Extract unique stores and categories
        food_stores_set = set()
        food_cats_set = set()
        for item in self.food_items:
            if item.get("store_name"):
                food_stores_set.add(item["store_name"])
            if item.get("category_name"):
                food_cats_set.add(item["category_name"])
        self.food_stores = list(food_stores_set)
        self.food_categories = list(food_cats_set)
        
        grocery_stores_set = set()
        grocery_cats_set = set()
        for item in self.grocery_items:
            if item.get("store_name"):
                grocery_stores_set.add(item["store_name"])
            if item.get("category_name"):
                grocery_cats_set.add(item["category_name"])
        self.grocery_stores = list(grocery_stores_set)
        self.grocery_categories = list(grocery_cats_set)
        
        print(f"    Food stores: {len(self.food_stores)}, categories: {len(self.food_categories)}")
        print(f"    Grocery stores: {len(self.grocery_stores)}, categories: {len(self.grocery_categories)}")

class TrainingDataGenerator:
    """Generate comprehensive training data"""
    
    def __init__(self, data_loader: OpenSearchDataLoader):
        self.loader = data_loader
        self.examples = []
        
        # Hindi templates for different contexts
        self.food_order_templates = [
            # Direct food ordering
            "{item} order karo",
            "{item} mangwa do",
            "mujhe {item} chahiye",
            "{quantity} {item} la do",
            "{item} bhej do",
            "ek {item} de do",
            "{store} se {item} mangwao",
            "{item} khana hai",
            
            # Restaurant context
            "{store} ka menu dikhao",
            "{store} se order karna hai",
            "kya {store} khula hai?",
            "{category} mein kya kya hai?",
            
            # Ready-to-eat phrases (THESE are restaurant orders)
            "aaj raat {item} khana hai",
            "lunch ke liye {item} order karo",
            "dinner mein {item} mangwa do",
            "abhi {item} bhej do",
            "jaldi se {item} la do",
        ]
        
        self.grocery_order_templates = [
            # Making food context (GROCERY)
            "nashta banana hai, {item} order karo",
            "{item} lana hai, {item2} bhi chahiye, khana banana hai",
            "ghar pe {item} nahi hai, mangwa do",
            "cooking ke liye {item} chahiye",
            "{item} aur {item2} le ao, khana pakana hai",
            "kal subah ke liye {item} chahiye",
            "grocery le ao - {item}",
            
            # Raw ingredients
            "kirana lana hai - {item}",
            "saman le ao - {item}, {item2}",
            "daily needs - {item}",
            "{store} se {item} mangwao",
            
            # Quantity + grocery context
            "{quantity} kg {item}",
            "{quantity} packet {item}",
            "{quantity} litre {item}",
            "ek dozen {item}",
        ]
        
        self.parcel_templates = [
            "parcel bhejni hai",
            "courier booking karo",
            "document send karna hai {location}",
            "{location} parcel bhejwana hai",
            "office se ghar tak parcel",
            "saman bhejwana hai",
            "packet pickup karo",
            "courier service chahiye",
            "delivery karwani hai",
            "parcel {location} bhej do",
        ]
        
        self.track_templates = [
            "mera order track karo",
            "order kahan pahuncha",
            "delivery status batao",
            "order ka status",
            "kab tak aayega order",
            "kitna time lagega",
            "tracking id do",
            "order #{order_id} ka status",
            "delivery boy kahan hai",
            "order late ho gaya",
        ]
        
        # Grocery-specific items (raw ingredients, not menu items)
        self.raw_ingredients = [
            "ande", "anda", "eggs", "egg",
            "doodh", "dudh", "milk",
            "bread", "double roti",
            "atta", "flour", "maida",
            "chawal", "rice",
            "dal", "daal",
            "cheeni", "sugar", "shakkar",
            "namak", "salt",
            "tel", "oil",
            "ghee",
            "dahi", "curd", "yogurt",
            "paneer",
            "butter", "makhan",
            "aloo", "potato",
            "pyaz", "onion",
            "tamatar", "tomato",
            "mirch", "chilli",
            "haldi", "turmeric",
            "jeera", "cumin",
            "dhania", "coriander",
            "adrak", "ginger",
            "lahsun", "garlic",
            "sabzi", "vegetables",
        ]
        
        # Restaurant items (ready-to-eat)
        self.restaurant_items = [
            "pizza", "burger", "biryani", "pulao",
            "dosa", "idli", "vada", "uttapam",
            "chole bhature", "pav bhaji",
            "samosa", "kachori", "pakoda",
            "momos", "chowmein", "noodles",
            "fried rice", "manchurian",
            "paneer tikka", "chicken tikka", 
            "butter chicken", "dal makhani",
            "naan", "roti", "paratha",
            "thali", "combo meal",
            "chai", "coffee", "lassi",
            "ice cream", "kulfi",
            "pastry", "cake",
            "sandwich", "wrap", "roll",
        ]
        
        self.quantities = ["1", "2", "3", "4", "5", "6", "ek", "do", "teen", "char", "paanch"]
        self.locations = ["Delhi", "Mumbai", "Pune", "Hyderabad", "Bangalore", "office", "ghar"]
    
    def generate_food_orders(self, count: int = 2000) -> List[TrainingExample]:
        """Generate restaurant food order examples"""
        examples = []
        
        # Use actual food items from OpenSearch
        for item in random.sample(self.loader.food_items, min(count//4, len(self.loader.food_items))):
            item_name = item.get("name", "").strip()
            store_name = item.get("store_name", "")
            category = item.get("category_name", "")
            
            if not item_name or len(item_name) < 2:
                continue
            
            # Generate variations
            for template in random.sample(self.food_order_templates, min(3, len(self.food_order_templates))):
                text = template.format(
                    item=item_name,
                    store=store_name or "restaurant",
                    category=category or "food",
                    quantity=random.choice(self.quantities)
                )
                examples.append(TrainingExample(
                    text=text,
                    intent="order_food",
                    slots={"item": item_name, "store": store_name},
                    tone="request",
                    language="hi-en"
                ))
        
        # Add restaurant-specific items
        for item in self.restaurant_items:
            for template in random.sample(self.food_order_templates, 5):
                store = random.choice(self.loader.food_stores) if self.loader.food_stores else "restaurant"
                text = template.format(
                    item=item,
                    store=store,
                    category="food",
                    quantity=random.choice(self.quantities)
                )
                examples.append(TrainingExample(
                    text=text,
                    intent="order_food",
                    slots={"item": item},
                    tone="request",
                    language="hi-en"
                ))
        
        return examples[:count]
    
    def generate_grocery_orders(self, count: int = 1500) -> List[TrainingExample]:
        """Generate grocery/raw ingredient order examples"""
        examples = []
        
        # Use actual grocery items from OpenSearch
        for item in random.sample(self.loader.grocery_items, min(count//4, len(self.loader.grocery_items))):
            item_name = item.get("name", "").strip()
            store_name = item.get("store_name", "")
            category = item.get("category_name", "")
            
            if not item_name or len(item_name) < 2:
                continue
            
            for template in random.sample(self.grocery_order_templates, min(2, len(self.grocery_order_templates))):
                item2 = random.choice(self.raw_ingredients)
                text = template.format(
                    item=item_name,
                    item2=item2,
                    store=store_name or "dukan",
                    quantity=random.choice(self.quantities)
                )
                examples.append(TrainingExample(
                    text=text,
                    intent="order_grocery",
                    slots={"item": item_name, "store": store_name},
                    tone="request",
                    language="hi-en"
                ))
        
        # Critical disambiguation examples (HIGH PRIORITY)
        disambiguation_examples = [
            # Making food = grocery
            ("nashta banana hai, ande aur bread mangwa do", "order_grocery"),
            ("khana pakana hai, atte aur daal chahiye", "order_grocery"),
            ("ghar pe doodh nahi hai, le ao", "order_grocery"),
            ("cooking ke liye pyaz tamatar chahiye", "order_grocery"),
            ("paratha banana hai, atta mangwa do", "order_grocery"),
            ("omelette banana hai, 6 ande la do", "order_grocery"),
            ("chai banana hai, doodh aur cheeni chahiye", "order_grocery"),
            ("subah ka nashta banana hai, bread aur butter mangwa do", "order_grocery"),
            
            # Ready to eat = food order
            ("chai aur bread order karo", "order_food"),
            ("ek chai aur sandwich de do", "order_food"),
            ("bread butter ready-made mangwa do", "order_food"),
            ("restaurant se ande ka omelette mangwa do", "order_food"),
            ("egg bhurji order karo", "order_food"),
            ("masala chai aur biscuit de do", "order_food"),
            ("dhaba se roti sabzi mangwa do", "order_food"),
        ]
        
        for text, intent in disambiguation_examples:
            examples.append(TrainingExample(
                text=text,
                intent=intent,
                confidence_hint=1.5  # Higher weight for disambiguation
            ))
        
        # Raw ingredients with grocery context
        for ingredient in self.raw_ingredients:
            for template in random.sample(self.grocery_order_templates, 3):
                item2 = random.choice([i for i in self.raw_ingredients if i != ingredient])
                text = template.format(
                    item=ingredient,
                    item2=item2,
                    store=random.choice(self.loader.grocery_stores) if self.loader.grocery_stores else "kirana",
                    quantity=random.choice(self.quantities)
                )
                examples.append(TrainingExample(
                    text=text,
                    intent="order_grocery",
                    slots={"item": ingredient},
                    language="hi-en"
                ))
        
        return examples[:count]
    
    def generate_parcel_orders(self, count: int = 500) -> List[TrainingExample]:
        """Generate parcel/courier booking examples"""
        examples = []
        
        for _ in range(count):
            template = random.choice(self.parcel_templates)
            location = random.choice(self.locations)
            text = template.format(location=location, order_id=random.randint(1000, 9999))
            examples.append(TrainingExample(
                text=text,
                intent="create_parcel_order",
                slots={"location": location},
                language="hi-en"
            ))
        
        return examples
    
    def generate_tracking(self, count: int = 300) -> List[TrainingExample]:
        """Generate order tracking examples"""
        examples = []
        
        for _ in range(count):
            template = random.choice(self.track_templates)
            text = template.format(order_id=random.randint(1000, 9999))
            examples.append(TrainingExample(
                text=text,
                intent="track_order",
                language="hi-en"
            ))
        
        return examples
    
    def generate_all(self) -> List[TrainingExample]:
        """Generate all training examples"""
        print("\nGenerating training examples...")
        
        all_examples = []
        
        # Food orders (restaurant)
        food_examples = self.generate_food_orders(2000)
        print(f"  Food orders: {len(food_examples)}")
        all_examples.extend(food_examples)
        
        # Grocery orders
        grocery_examples = self.generate_grocery_orders(1500)
        print(f"  Grocery orders: {len(grocery_examples)}")
        all_examples.extend(grocery_examples)
        
        # Parcel orders
        parcel_examples = self.generate_parcel_orders(500)
        print(f"  Parcel orders: {len(parcel_examples)}")
        all_examples.extend(parcel_examples)
        
        # Tracking
        track_examples = self.generate_tracking(300)
        print(f"  Tracking: {len(track_examples)}")
        all_examples.extend(track_examples)
        
        print(f"\nTotal: {len(all_examples)} examples")
        return all_examples

class NLUTrainer:
    """Train the NLU service"""
    
    def __init__(self, nlu_url: str = NLU_URL):
        self.nlu_url = nlu_url
        
    def check_health(self) -> bool:
        """Check if NLU service is healthy"""
        try:
            response = requests.get(f"{self.nlu_url}/healthz", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def get_current_intents(self) -> Dict[str, int]:
        """Get current intent counts"""
        try:
            response = requests.get(f"{self.nlu_url}/intents", timeout=10)
            return response.json() if response.status_code == 200 else {}
        except:
            return {}
    
    def add_intent_examples(self, intent: str, examples: List[str], batch_size: int = 50) -> int:
        """Add examples for an intent"""
        added = 0
        for i in range(0, len(examples), batch_size):
            batch = examples[i:i+batch_size]
            try:
                response = requests.post(
                    f"{self.nlu_url}/add_intent",
                    json={"intent": intent, "examples": batch},
                    timeout=60
                )
                if response.status_code == 200:
                    added += len(batch)
            except Exception as e:
                print(f"    Error adding batch: {e}")
            time.sleep(0.1)  # Rate limiting
        return added
    
    def train(self, examples: List[TrainingExample]):
        """Train NLU with all examples"""
        print("\n" + "="*50)
        print("Starting NLU Training")
        print("="*50)
        
        if not self.check_health():
            print("ERROR: NLU service not available")
            return
        
        # Get current state
        current = self.get_current_intents()
        print(f"\nCurrent intents: {sum(current.values())} total examples")
        
        # Group examples by intent
        by_intent = defaultdict(list)
        for ex in examples:
            by_intent[ex.intent].append(ex.text)
        
        print(f"\nNew training data:")
        for intent, texts in by_intent.items():
            print(f"  {intent}: {len(texts)} examples")
        
        # Train each intent
        print("\nTraining...")
        total_added = 0
        for intent, texts in by_intent.items():
            # Deduplicate
            unique_texts = list(set(texts))
            print(f"\n  {intent}: {len(unique_texts)} unique examples")
            
            added = self.add_intent_examples(intent, unique_texts)
            total_added += added
            print(f"    Added: {added}")
        
        print(f"\n{'='*50}")
        print(f"Training complete: {total_added} examples added")
        
        # Verify
        final = self.get_current_intents()
        print(f"\nFinal state:")
        for intent, count in sorted(final.items(), key=lambda x: -x[1]):
            old = current.get(intent, 0)
            diff = count - old
            if diff > 0:
                print(f"  {intent}: {count} (+{diff})")
            else:
                print(f"  {intent}: {count}")

def save_training_data(examples: List[TrainingExample], filepath: str):
    """Save training data to JSON file"""
    data = []
    for ex in examples:
        item = {
            "text": ex.text,
            "intent": ex.intent
        }
        if ex.slots:
            item["slots"] = ex.slots
        if ex.tone:
            item["tone"] = ex.tone
        if ex.language:
            item["language"] = ex.language
        data.append(item)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {len(data)} examples to {filepath}")

def main():
    print("="*60)
    print("Mangwale Comprehensive NLU Training")
    print("="*60)
    
    # Load data from OpenSearch
    loader = OpenSearchDataLoader()
    loader.load_all()
    
    # Generate training examples
    generator = TrainingDataGenerator(loader)
    examples = generator.generate_all()
    
    # Save to file
    save_training_data(
        examples, 
        "/home/ubuntu/Devs/MangwaleAI/backend/training-data/comprehensive_nlu_training.json"
    )
    
    # Train NLU
    trainer = NLUTrainer()
    trainer.train(examples)
    
    print("\n" + "="*60)
    print("Training Complete!")
    print("="*60)

if __name__ == "__main__":
    main()
