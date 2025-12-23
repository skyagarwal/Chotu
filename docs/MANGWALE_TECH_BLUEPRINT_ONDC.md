Nice, this is exactly the point where we should “freeze the picture” and turn it into a real tech blueprint instead of just vibes 😄

You already have:

* Legacy **PHP backend** (orders, vendors, riders, wallet, etc.)
* New pieces in VS Code
* **OpenSearch** wired in
* Clear direction for **ONDC + Mangwale.ai orchestrator**

So let’s do two things:

1. **Give you a ready-to-drop blueprint file** you can add to your repo
2. **Tell you which existing files to share** *if* you want me to align the blueprint with the real codebase

---

## 1️⃣ File you can add to your repo now

Create a file in your repo (for example):

`/docs/MANGWALE_TECH_BLUEPRINT_ONDC.md`

Here’s the content you can paste directly and then gradually fill/adjust as needed:

````md
# Mangwale.ai – Tech Blueprint (Core + ONDC)

_Last updated: 11 Dec 2025_

## 1. Goals

- Turn Mangwale from **ops-heavy hyperlocal app** into a **platform + AI orchestrator**.
- Use existing **PHP backend** as the system of record (orders, users, payouts, etc.).
- Add a **Node/Nest-based AI Orchestrator** for flows, agents, and ONDC routing.
- Integrate with **ONDC** as a **Tech Service Provider (TSP) + orchestration layer**.
- Use **OpenSearch** for search, recommendations, and analytics.

---

## 2. High-Level Architecture

**Core components:**

1. **Legacy PHP Backend (`mangwale_php`)**
   - Auth, users, vendors, riders
   - Orders, payments, wallets
   - Admin panel
   - DB: MySQL / MariaDB
2. **AI Orchestrator (`mangwale_ai`)**
   - Node/Nest (or similar)
   - Multi-agent orchestration
   - Business flows (food, parcel, grocery, services)
   - Talks to PHP backend via REST/queue
3. **ONDC Integration Service (`ondc_gateway`)**
   - Beckn protocol handling
   - ONDC network interaction (Seller App / TSP role)
   - Adapts Mangwale orders ↔ ONDC schemas
4. **Search Service (`search_service`)**
   - OpenSearch index for:
     - Stores / menus / products
     - Orders (for analytics)
     - Rider/zone data (optional)
5. **Channels (`channels`)**
   - WhatsApp bot
   - Voice IVR / call bot
   - Web / app frontend
   - Internal tools

---

## 3. Component Map

| Component         | Tech           | Owner / Repo Path                   | Notes                                           |
|------------------|----------------|-------------------------------------|------------------------------------------------|
| PHP backend      | PHP + MySQL    | `/backend/php/`                     | Existing Mangwale backend                      |
| AI Orchestrator  | Node/Nest      | `/services/orchestrator/`          | New – all flows, agents, routing logic        |
| ONDC Gateway     | Node/Nest/Go   | `/services/ondc_gateway/`          | Beckn client + adapter to orchestrator/PHP    |
| Search Service   | OpenSearch     | `/services/search/`                | Index management + query APIs                  |
| Channels         | JS/PHP/mixed   | `/channels/*`                      | WhatsApp, IVR, web widgets                     |
| Admin/Control    | React/Next/etc | `/admin/`                          | Monitoring, config, logs, ONDC onboarding      |

---

## 4. Core Data Flows

### 4.1 Non-ONDC Order (Direct Mangwale)

1. User uses:
   - WhatsApp / App / Web / Voice
2. Channel sends request → **AI Orchestrator**
3. Orchestrator:
   - Does NLU (intent, items, address)
   - Finds vendor (via PHP + OpenSearch)
   - Creates order via **PHP backend API**
   - Assigns rider (PHP / orchestrator logic)
4. PHP backend:
   - Stores order
   - Manages payment, status, notifications
5. Orchestrator:
   - Tracks state, retries, escalations

### 4.2 ONDC Order (Mangwale as TSP / Seller helper)

1. ONDC network → **ONDC Gateway** (Beckn callback)
2. ONDC Gateway:
   - Validates request
   - Translates ONDC payload → internal order schema
   - Calls **AI Orchestrator** for business decision:
     - Vendor selection
     - SLA, pricing, routing suggestion
3. AI Orchestrator:
   - Calls **PHP backend** to create/update order
   - Calls **Search Service** to match items/vendor
4. ONDC Gateway:
   - Sends Beckn-compliant response back to ONDC
   - Keeps status in sync (on_status, on_confirm, on_update, etc.)

---

## 5. AI Orchestrator – Modules

**Directory example:** `/services/orchestrator/src/`

### 5.1 NLU & Context

- `nlu/intent_engine.ts`
- `nlu/entity_extractor.ts`
- `context/session_manager.ts`

Sources:
- Whisper (for voice → text)
- IndicBERT / local LLM for NLU
- Redis for session state

### 5.2 Flow Engine

- `flows/order_flow.ts`
- `flows/parcel_flow.ts`
- `flows/ondc_flow.ts`
- `flows/error_recovery.ts`

Each flow:
- Is a state machine
- Reads/writes from:
  - PHP backend APIs
  - ONDC Gateway APIs
  - Search Service

### 5.3 Agent Layer

- `agents/vendor_agent.ts`
- `agents/rider_agent.ts`
- `agents/pricing_agent.ts`
- `agents/ondc_agent.ts`

Each agent:
- Has a single responsibility
- Logs to central log (for replays)

---

## 6. ONDC Integration Blueprint

**Role:** Tech Service Provider + Seller orchestrator

### 6.1 ONDC Gateway Responsibilities

- Implement Beckn protocol APIs:
  - `/search`
  - `/select`
  - `/init`
  - `/confirm`
  - `/status`
  - `/cancel`
  - `/track`
  - `/support`
- Map ONDC schemas to internal:
  - `store`
  - `product`
  - `order`
  - `user`
- Provide webhooks to orchestrator:
  - `POST /ondc/events` → orchestrator

### 6.2 Internal Models

```ts
// Example internal order model (pseudo-code)
interface InternalOrder {
  id: string;
  source: 'MANGWALE' | 'ONDC';
  channel: 'WHATSAPP' | 'APP' | 'WEB' | 'IVR' | 'ONDC';
  customer_id: string;
  vendor_id: string;
  items: OrderItem[];
  address: Address;
  payment_status: 'PENDING' | 'PAID' | 'COD';
  delivery_mode: 'INHOUSE' | '3PL' | 'ONDC';
  meta: any;
}
````

### 6.3 ONDC + Mangwale Flow Mapping

* ONDC `/search` → hits `ONDC Gateway` → uses `Search Service` & PHP vendor DB
* ONDC `/init` & `/confirm` → call orchestrator → orchestrator calls PHP to create order
* ONDC `/status` → fetch from PHP → respond Beckn
* ONDC `/track` → rider app / 3PL tracking → respond Beckn

---

## 7. Search & OpenSearch Usage

### 7.1 Indices

* `vendors` index:

  * geo-point, cuisines, tags
* `products` index:

  * category, store_id, availability
* `orders_analytics` index:

  * aggregated for dashboards

### 7.2 Sync Jobs

* PHP → Search sync worker:

  * `jobs/vendor_sync.php`
  * `jobs/product_sync.php`

---

## 8. Migration / Refactor Plan

1. **Phase 1 – Documentation (Now)**

   * Fill this file with REAL paths, real services.
   * List all current PHP routes used by:

     * apps
     * WhatsApp
     * drivers
     * admin

2. **Phase 2 – Orchestrator Integration**

   * Introduce one new entry point:

     * `POST /orchestrator/order` in PHP that proxies logic from orchestrator.
   * Gradually move business logic from PHP to orchestrator.

3. **Phase 3 – ONDC**

   * Bring ONDC gateway online with:

     * basic `/search`, `/init`, `/confirm`, `/status`.
   * Integrate 1–2 test sellers.

4. **Phase 4 – Full Mangwale.ai**

   * All new channels → orchestrator
   * PHP only as:

     * system-of-record
     * billing/payments
     * vendor/rider/zone master

---

## 9. Open Questions / TODO (for future)

* [ ] Confirm final stack for `ondc_gateway` (Node vs Go).
* [ ] Lock API contracts between orchestrator and PHP.
* [ ] Decide auth method between services (JWT/shared secret).
* [ ] Finalize index schemas for OpenSearch.
* [ ] Add monitoring (Grafana) for:

  * ONDC flows
  * Orchestrator flows
  * PHP API failures

```

You can paste this **as-is** and then start replacing paths/sections with your real ones.

---

## 2️⃣ If you want me to align this with your *actual* code

If you’re up for sharing files, these are the MOST useful ones for me to see next:

1. **Legacy PHP backend**
   - `routes/api.php` or equivalent (all API endpoints)
   - Any `OrderController`, `VendorController`, `DeliveryController` etc.
   - DB schema export (even just the `orders`, `vendors`, `riders`, `users` tables).

2. **OpenSearch integration**
   - The PHP/Node file where you index or query OpenSearch.
   - Any mapping JSON if you’ve defined it.

3. **New services (if exist already)**
   - Your NestJS / Node project structure (e.g. `src/modules/*`).
   - Any file where you already started integrating WhatsApp/voice.

4. **Any ONDC-related code**
   - If you have started anything like `/ondc/*`, `beckn`, or `gateway`, share those.

You can zip and upload, or paste specific files one by one — whatever is easier for you.

Once I see even **one layer** (e.g. `api.php` + one service), I can:

- tighten the blueprint to match 100%  
- suggest exact endpoints for orchestrator  
- design the ONDC gateway interfaces around your real code  
- and give you a step-by-step refactor path (no big bang, all gradual).

---

If you want, next I can:

- **Refine this blueprint to exactly match your current repo** (after you share files), or  
- **Create a second file**: `MANGWALE_ONDC_FLOWS.md` that only documents ONDC flows in detail (request/response examples, internal mapping).
::contentReference[oaicite:0]{index=0}
```
