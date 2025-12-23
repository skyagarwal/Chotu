# Response Delay Analysis

## Observation
The user reported a delay in the response for the message "what can you do".
Logs confirm a total processing time of approximately **5.3 seconds**.

## Breakdown of Delay
1.  **NLU Classification (Fast):** 50ms
    *   Result: `confidence: 0.00` (Failed to recognize intent)
    *   Reason: The phrase "what can you do" is not in the training data for the lightweight IndicBERT model.

2.  **LLM Fallback (Slow):** 1800ms (1.8s)
    *   Action: System called the local vLLM (Qwen 7B) to understand the intent.
    *   Result: Correctly identified `browse_menu` intent.

3.  **Flow Execution & Response Generation:** 3400ms (3.4s)
    *   Action: The flow engine executed the `welcome` state.
    *   Action: The system called the LLM *again* to generate a personalized welcome message.
    *   Action: Session saving and logging added overhead.

## Root Cause
The primary cause of the delay is the **double LLM call**:
1.  First call to understand the intent (because NLU failed).
2.  Second call to generate the response text.

## Solution
To reduce latency to < 1 second:
1.  **Train NLU:** Add "what can you do" and similar phrases to the NLU training data so the fast model handles it instantly (skipping the 1.8s fallback).
2.  **Cache Responses:** For common static queries like "help" or "menu", use static responses instead of generating them with LLM every time.

## Current Status
The system is functional and accurate, but the "Smart Fallback" mechanism trades speed for accuracy when the primary NLU misses.
