# Mangwale AI - Comprehensive Fix & Feature Plan

This document outlines the remaining tasks to fully align the bot with business requirements.

## 1. Core Conversation & Flow Logic
- [x] **Fix "Long Message" Hallucinations:** Implemented concise prompts and `check_trigger` logic to skip greetings for direct queries.
- [x] **Fix Flow Detection:** Updated `findFlowByIntent` to fallback to message keyword matching if NLU fails (Fixed "order paneer" issue).
- [x] **Rename Parcel to Coolie:** Updated `parcel-delivery.flow.ts` to "Coolie / Local Delivery".
- [ ] **Small Talk Handling:** Verify `chitchat.flow.ts` handles casual conversation without triggering orders.
- [ ] **Language Support:** Implement language detection (Hinglish/Hindi/Marathi) and pass `language` context to LLM prompts.

## 2. User Profile & Auth
- [ ] **Profile Completion:** Ensure bot asks for Name/Address only when needed (Lazy Collection).
- [ ] **Login Integration:** Verify `auth_token` persistence and "Login to use saved addresses" flow.
- [ ] **Chat-in-Line Login:** Ensure login happens within the chat window (using buttons/links) without redirecting away if possible.

## 3. Order & Checkout Flow
- [ ] **Cart Management:** Verify `add_to_cart` logic in `ecommerce-order.flow.ts`.
- [ ] **Checkout Process:** Ensure `checkout` state correctly summarizes the order.
- [ ] **Payment Integration:** Verify `phpPaymentService` integration for fetching payment methods.
- [ ] **Order Placement:** Verify `phpOrderService` creates the order correctly in the backend.

## 4. Specific Features
- [ ] **Upselling:** Verify `upsell_offer` state in `food-order.flow.ts` suggests relevant items.
- [ ] **Coolie / Local Delivery:** Test the full flow: Pickup -> Drop -> Recipient -> Weight -> Price -> Confirm.
- [ ] **Payload Awareness:** Ensure `SearchExecutor` returns correct JSON for UI cards (Swatches).

## 5. Business Awareness
- [x] **Identity:** Bot now knows it is "Mangwale" in "Nashik".
- [x] **Services:** Bot knows Food, Coolie (Parcel), Mart, Pharmacy.
- [ ] **Local Knowledge:** Enhance `personality.config.ts` with more local landmarks if needed.

## 6. Next Steps for Developer
1.  **Rebuild Backend:** Apply the latest fixes (`findFlowByIntent`).
2.  **Test "Order Paneer":** Verify it now triggers `food-order.flow.ts`.
3.  **Test "Coolie":** Verify it triggers `parcel-delivery.flow.ts`.
4.  **Implement Language Detection:** Add a simple language detector in `AgentOrchestrator`.
