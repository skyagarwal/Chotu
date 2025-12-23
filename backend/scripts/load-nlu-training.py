#!/usr/bin/env python3
"""
Load generated training data into NLU service.
Uses the /add_intent endpoint to add examples.
"""

import json
import requests
from pathlib import Path
from collections import defaultdict

NLU_URL = "http://localhost:7010"

def load_training_data(filepath: str) -> dict:
    """Load training data and group by intent."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    by_intent = defaultdict(list)
    for item in data:
        by_intent[item["intent"]].append(item["text"])
    
    return dict(by_intent)

def add_intent_examples(intent: str, examples: list, replace: bool = False) -> dict:
    """Add examples for an intent to NLU service."""
    try:
        response = requests.post(
            f"{NLU_URL}/add_intent",
            json={
                "intent": intent,
                "examples": examples,
                "replace": replace
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def main():
    print("=" * 60)
    print("Loading training data into NLU service")
    print("=" * 60)
    
    # Load generated training data
    generated_path = Path(__file__).parent.parent / "training-data" / "generated_nlu_training.json"
    
    if not generated_path.exists():
        print(f"❌ Training data not found: {generated_path}")
        return
    
    data_by_intent = load_training_data(generated_path)
    
    print(f"\n📊 Training data by intent:")
    for intent, examples in sorted(data_by_intent.items()):
        print(f"  - {intent}: {len(examples)} examples")
    
    # Check current NLU intents
    print("\n📋 Current NLU intents:")
    try:
        response = requests.get(f"{NLU_URL}/intents", timeout=10)
        current = response.json()
        for intent, count in sorted(current.items()):
            print(f"  - {intent}: {count}")
    except Exception as e:
        print(f"  ❌ Error: {e}")
        current = {}
    
    # Add examples for each intent
    print("\n🔄 Adding training examples...")
    
    for intent, examples in data_by_intent.items():
        # Skip if we already have many examples
        current_count = current.get(intent, 0)
        
        # Only add if we have new data
        if len(examples) > 0:
            result = add_intent_examples(intent, examples, replace=False)
            if "error" in result:
                print(f"  ❌ {intent}: {result['error']}")
            else:
                print(f"  ✅ {intent}: added {len(examples)}, total: {result.get('total_examples', 'N/A')}")
    
    # Verify final state
    print("\n📊 Final NLU intents:")
    try:
        response = requests.get(f"{NLU_URL}/intents", timeout=10)
        final = response.json()
        for intent, count in sorted(final.items()):
            print(f"  - {intent}: {count}")
    except Exception as e:
        print(f"  ❌ Error: {e}")
    
    # Test a few classifications
    print("\n🧪 Testing classifications...")
    
    test_cases = [
        ("Mujhe 6 anndi jaldi ghar pe bhej do", "order_food"),
        ("4 roti inayat cafe se bhej do ghar pe", "order_food"),
        ("mujhe ghar se official parcel pickup karna hai", "create_parcel_order"),
        ("biryani bhej do jaldi", "order_food"),
        ("courier booking karo", "create_parcel_order"),
    ]
    
    for text, expected in test_cases:
        try:
            response = requests.post(
                f"{NLU_URL}/classify",
                json={"text": text},
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            result = response.json()
            intent = result.get("intent", "unknown")
            conf = result.get("intent_conf", 0)
            status = "✅" if intent == expected else "❌"
            print(f"  {status} \"{text[:50]}...\" → {intent} ({conf:.2%}) [expected: {expected}]")
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    print("\n✨ Done!")

if __name__ == "__main__":
    main()
