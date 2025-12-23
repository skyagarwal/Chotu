# Nashik Zone Awareness & Server-Side Pricing Implementation

## Overview
Successfully refactored the Parcel Delivery flow to be "Nashik Zone Aware" and delegated all pricing logic to the PHP backend. This ensures that delivery charges are calculated based on the specific zones (e.g., Nashik Road vs. Gangapur Road) and their respective rates, rather than a generic hardcoded formula.

## Key Changes

### 1. Zone Identification
- **Address Collection:** The system now captures `zone_id` for every address collected (Pickup & Delivery).
- **Validation:** Added strict zone validation in `executeValidateZoneStep`. If a location is outside serviceable zones, the user is notified immediately.
- **Storage:** Zone IDs are stored in the flow context as `sender_zone_id` and `receiver_zone_id`.

### 2. Server-Side Pricing
- **API Integration:** Implemented `calculateShippingCharge` in `PhpParcelService` which calls `/api/v1/parcel/shipping-charge`.
- **Orchestrator Update:** Replaced local math (e.g., `distance * 11.11`) in `AgentOrchestratorService` with a direct API call.
- **Dynamic Rates:** Pricing now considers:
  - Exact distance (OSRM/Google Maps)
  - Parcel Category (Documents, Food, etc.)
  - Source & Destination Zones (Inter-zone rates)

### 3. Category Filtering
- **Zone-Specific Categories:** `showParcelCategories` now passes the `sender_zone_id` to the backend to fetch only categories available in that specific zone.

### 4. Order Creation
- **Zone Propagation:** The final order creation step (`executeApiCallStep`) passes the captured `senderZoneId` and `deliveryZoneId` to the PHP backend, ensuring the order is assigned to the correct hub/driver.

## Technical Components Updated
- `backend/src/agents/services/agent-orchestrator.service.ts`
- `backend/src/php-integration/services/parcel.service.ts`
- `backend/src/agents/services/address-extraction.service.ts`
- `backend/src/common/interfaces/common.interface.ts`

## Verification
- **Zone Logic:** Validated via `getZoneByLocation` API.
- **Pricing:** Validated via `calculateShippingCharge` API.
- **Flow:** Validated end-to-end flow context propagation.

The system is now fully aligned with the "Nashik Zone" business logic.
