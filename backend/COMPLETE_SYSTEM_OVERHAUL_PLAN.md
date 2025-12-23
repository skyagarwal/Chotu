# Mangwale AI System Overhaul Plan

This document tracks the comprehensive audit and fixes required to make the Mangwale AI bot business-aware, concise, and fully functional across all requested domains.

## 1. Current Issues & Immediate Fixes
- [ ] **Fix Verbose/Hallucinated Responses:** The bot sends long, unstructured paragraphs (e.g., "Welcome to Mangwale in Nashik...") instead of structured interactions.
    - *Action:* Audit System Prompts and LLM Executor configuration.
    - *Action:* Ensure "food near me" triggers the structured `food-order` flow, not a generic chat.
- [ ] **Business Awareness:** The bot seems unaware of specific Mangwale offerings/inventory in general conversation.
    - *Action:* Inject business context (RAG or System Prompt) into the LLM.

## 2. Functional Audit & Implementation
### 2.1 Small Talk & Normal Conversation
- [ ] **Status:** To be audited.
- [ ] **Requirement:** Handle greetings/chitchat concisely without hallucinating orders.
- [ ] **Action:** Configure a specific `small-talk` flow or restricted LLM prompt.

### 2.2 User Profile Completion
- [ ] **Status:** Partially implemented (context service).
- [ ] **Requirement:** Proactively ask for missing details (Name, Address, Preferences) only when needed.
- [ ] **Action:** Verify `profile-update` logic within flows.

### 2.3 Login & Auth Integration
- [ ] **Status:** OTP loop fixed.
- [ ] **Requirement:** Seamless login in frontend; Bot must know user identity.
- [ ] **Action:** Verify `auth_token` and `user_id` persistence in Flow Context.

### 2.4 Order Selection to Checkout
- [ ] **Status:** `food-order` flow exists but needs verification of the "Checkout" phase.
- [ ] **Requirement:** Add to cart -> Review Cart -> Confirm Order.
- [ ] **Action:** Implement/Verify `cart` management in Flow Context and `checkout` state.

### 2.5 Payment Integration
- [ ] **Status:** Unknown.
- [ ] **Requirement:** Handle payment processing (or mock it for now).
- [ ] **Action:** Check for Payment Gateway integration; implement if missing.

### 2.6 Parcel Pickup & Drop (Delivery)
- [ ] **Status:** Unknown.
- [ ] **Requirement:** A separate flow for "Genie/Dunzo" style tasks.
- [ ] **Action:** Create or update `delivery.flow.ts`.

### 2.7 Upselling
- [ ] **Status:** Requested.
- [ ] **Requirement:** Suggest add-ons (Drinks, Desserts) before checkout.
- [ ] **Action:** Add `upsell` state in `food-order` flow.

### 2.8 Multi-language Support (Hinglish, Hindi, Marathi)
- [ ] **Status:** English only.
- [ ] **Requirement:** Detect language and respond accordingly.
- [ ] **Action:** Integrate Language Detection (LLM or Library) and configure prompts to respect input language.

## 3. Technical Tasks
- [ ] **Payload Awareness:** Ensure bot sends correct JSON payloads for UI cards (Swatches).
- [ ] **Context Persistence:** Ensure cart/order state survives across turns.
