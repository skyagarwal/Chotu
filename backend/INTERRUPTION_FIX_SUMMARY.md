# Fix Summary: Bot Interruption during Transactional Flows

## Issue
The bot was interrupting transactional flows (specifically "Checkout") with profile enrichment questions (e.g., "Any allergies?").

## Root Cause
1.  **Intent Misclassification:** The NLU/LLM classified "Checkout" as `intent: "unknown"`.
2.  **Logic Gap:** The suppression logic in `ConversationService.ts` relied solely on the NLU intent. Since the intent was `unknown`, the `isTransactional` check failed, allowing the enrichment service to trigger.

## Fix Implemented
Updated `backend/src/conversation/services/conversation.service.ts` to include a **keyword-based fallback**.

```typescript
// Also check for transactional keywords in the message itself
const lowerMessage = messageText.toLowerCase();
const transactionalKeywords = ['checkout', 'check out', 'buy', 'order', 'pay', 'confirm', 'track'];
const isTransactionalKeyword = transactionalKeywords.some(k => lowerMessage.includes(k));

const isTransactional = (intent && transactionalIntents.includes(intent)) || isTransactionalKeyword;
```

## Verification
*   **E2E Test:** `backend/test-e2e-flow.js`
*   **Result:**
    *   User: "Checkout"
    *   Bot: "Welcome..." (Enrichment skipped)
    *   Log: `[ConversationService] Intent: unknown, Is Transactional: true (Keyword match: true)`

## Remaining Issues
The E2E test fails at the final step ("Order placement not confirmed") because the `handleCheckout` method in `ConversationService.ts` is currently a stub (`not implemented`). The bot responds with generic messages instead of processing the checkout.

## Next Steps
1.  Implement `handleCheckout` logic to transition to payment selection.
2.  Ensure the Agent triggers this flow when "Checkout" is detected.
