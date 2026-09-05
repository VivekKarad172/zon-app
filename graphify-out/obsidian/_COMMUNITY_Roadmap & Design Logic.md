---
type: community
cohesion: 0.12
members: 33
---

# Roadmap & Design Logic

**Cohesion:** 0.12 - loosely connected
**Members:** 33 nodes

## Members
- [[Database Seed Script]] - code - server/seed.js
- [[Dealer Password First-Login Flow]] - document - FUTURE_UPDATES.md
- [[Design Logic (Blank Size)]] - code - server/utils/designLogic.js
- [[Dispatch Confirmation  Delivery Proof]] - document - FUTURE_UPDATES.md
- [[Excel Export for Accountant]] - document - FUTURE_UPDATES.md
- [[Express Server (server.js)]] - code - server/server.js
- [[Future Updates Roadmap]] - document - FUTURE_UPDATES.md
- [[HPL Door Category Support]] - document - FUTURE_UPDATES.md
- [[Low Stock Auto-Reorder Suggestion]] - document - FUTURE_UPDATES.md
- [[Manager Role Full Dashboard]] - document - FUTURE_UPDATES.md
- [[Manager Seed Script]] - code - server/seed_manager.js
- [[Mobile App Push Notifications (FCM)]] - document - FUTURE_UPDATES.md
- [[Packing Slip  Delivery Challan PDF]] - document - FUTURE_UPDATES.md
- [[Reports Router]] - code - server/routes/reports.js
- [[Sheets  Stock Router]] - code - server/routes/sheets.js
- [[Test API Direct (http login + sheets)]] - code - test_api_direct.js
- [[Test API Response (sheets)]] - code - test_api_response.js
- [[Test Auth Login]] - code - server/test_login.js
- [[Test Blank Size Logic]] - code - test_blank_logic.js
- [[Test Create Distributor (DB direct)]] - code - server/test_create_distributor.js
- [[Test Sheets API (axios)]] - code - server/test_api_http.js
- [[Test Sheets API (fetch)]] - code - server/test_http.js
- [[Test Sheets API (fetch, raw)]] - code - server/test_http2.js
- [[Test Sheets Endpoint Logic]] - code - test_api.js
- [[Users Router]] - code - server/routes/users.js
- [[Verify Distributor Create (API)]] - code - verify_distributor_create.js
- [[Verify Stock Lifecycle (Option B)]] - code - verify_option_b.js
- [[WhatsApp Notification Service]] - code - server/utils/whatsapp.js
- [[WhatsApp Two-Way Updates]] - document - FUTURE_UPDATES.md
- [[Worker Performance Dashboard]] - document - FUTURE_UPDATES.md
- [[Workers  Factory Router]] - code - server/routes/workers.js
- [[getDesignType]] - code - server/utils/designLogic.js
- [[getOptimalBlankSize]] - code - server/utils/designLogic.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Roadmap__Design_Logic
SORT file.name ASC
```
