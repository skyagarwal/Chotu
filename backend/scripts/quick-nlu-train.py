#!/usr/bin/env python3
"""
Quick NLU training loader - loads training data in smaller batches
"""
import requests
import json
import time

NLU_URL = "http://localhost:7010"
TRAINING_FILE = "/home/ubuntu/Devs/MangwaleAI/backend/training-data/comprehensive_nlu_training.json"

def load_and_train():
    # Load training data
    with open(TRAINING_FILE) as f:
        data = json.load(f)
    
    print(f"Loaded {len(data)} examples")
    
    # Group by intent
    by_intent = {}
    for item in data:
        intent = item['intent']
        if intent not in by_intent:
            by_intent[intent] = []
        by_intent[intent].append(item['text'])
    
    # Get current counts
    try:
        current = requests.get(f"{NLU_URL}/intents", timeout=10).json()
    except:
        current = {}
    
    print("\nCurrent state:")
    for intent, texts in by_intent.items():
        curr_count = current.get(intent, 0)
        print(f"  {intent}: {curr_count} existing, {len(texts)} to add")
    
    # Train with smaller batches
    batch_size = 20
    timeout = 120
    
    for intent, texts in by_intent.items():
        unique = list(set(texts))
        print(f"\nTraining {intent}: {len(unique)} unique examples")
        
        added = 0
        for i in range(0, len(unique), batch_size):
            batch = unique[i:i+batch_size]
            try:
                resp = requests.post(
                    f"{NLU_URL}/add_intent",
                    json={"intent": intent, "examples": batch},
                    timeout=timeout
                )
                if resp.status_code == 200:
                    added += len(batch)
                    print(f"  Batch {i//batch_size + 1}: +{len(batch)} (total: {added})")
            except Exception as e:
                print(f"  Batch {i//batch_size + 1}: Error - {str(e)[:50]}")
            time.sleep(0.5)  # Rate limit
        
        print(f"  Done: {added} added")
    
    # Final check
    final = requests.get(f"{NLU_URL}/intents", timeout=10).json()
    print("\n=== Final state ===")
    for intent, count in sorted(final.items(), key=lambda x: -x[1]):
        print(f"  {intent}: {count}")

if __name__ == "__main__":
    load_and_train()
