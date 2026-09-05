# Graph Report - .  (2026-06-21)

## Corpus Check
- 129 files · ~116,102 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 778 nodes · 1251 edges · 85 communities (68 shown, 17 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 137 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin UI Components|Admin UI Components]]
- [[_COMMUNITY_Stock Adjustment Scripts|Stock Adjustment Scripts]]
- [[_COMMUNITY_Roadmap & Design Logic|Roadmap & Design Logic]]
- [[_COMMUNITY_App Routing & Auth|App Routing & Auth]]
- [[_COMMUNITY_Data Models (Sequelize)|Data Models (Sequelize)]]
- [[_COMMUNITY_Reports Dashboard UI|Reports Dashboard UI]]
- [[_COMMUNITY_ManagerWorker UI & API Calls|Manager/Worker UI & API Calls]]
- [[_COMMUNITY_Schema Fix & Migration Scripts|Schema Fix & Migration Scripts]]
- [[_COMMUNITY_Corrected Re-Import (Gujarati)|Corrected Re-Import (Gujarati)]]
- [[_COMMUNITY_Doortype Backfill & Historical Import|Doortype Backfill & Historical Import]]
- [[_COMMUNITY_Production Unit Checks|Production Unit Checks]]
- [[_COMMUNITY_UserDealer Check Scripts|User/Dealer Check Scripts]]
- [[_COMMUNITY_Sheet Import Pipeline|Sheet Import Pipeline]]
- [[_COMMUNITY_Sheets API & Stock|Sheets API & Stock]]
- [[_COMMUNITY_Client Hooks & Offline Sync|Client Hooks & Offline Sync]]
- [[_COMMUNITY_Catalogue  Master Data API|Catalogue / Master Data API]]
- [[_COMMUNITY_Module 16|Module 16]]
- [[_COMMUNITY_Module 17|Module 17]]
- [[_COMMUNITY_Module 18|Module 18]]
- [[_COMMUNITY_Module 19|Module 19]]
- [[_COMMUNITY_Module 20|Module 20]]
- [[_COMMUNITY_Module 21|Module 21]]
- [[_COMMUNITY_Module 22|Module 22]]
- [[_COMMUNITY_Module 23|Module 23]]
- [[_COMMUNITY_Module 24|Module 24]]
- [[_COMMUNITY_Module 25|Module 25]]
- [[_COMMUNITY_Module 26|Module 26]]
- [[_COMMUNITY_Module 27|Module 27]]
- [[_COMMUNITY_Module 28|Module 28]]
- [[_COMMUNITY_Module 29|Module 29]]
- [[_COMMUNITY_Module 30|Module 30]]
- [[_COMMUNITY_Module 31|Module 31]]
- [[_COMMUNITY_Module 32|Module 32]]
- [[_COMMUNITY_Module 33|Module 33]]
- [[_COMMUNITY_Module 34|Module 34]]
- [[_COMMUNITY_Module 35|Module 35]]
- [[_COMMUNITY_Module 36|Module 36]]
- [[_COMMUNITY_Module 37|Module 37]]
- [[_COMMUNITY_Module 38|Module 38]]
- [[_COMMUNITY_Module 39|Module 39]]
- [[_COMMUNITY_Module 40|Module 40]]
- [[_COMMUNITY_Module 41|Module 41]]
- [[_COMMUNITY_Module 42|Module 42]]
- [[_COMMUNITY_Module 43|Module 43]]
- [[_COMMUNITY_Module 44|Module 44]]
- [[_COMMUNITY_Module 45|Module 45]]
- [[_COMMUNITY_Module 46|Module 46]]
- [[_COMMUNITY_Module 47|Module 47]]
- [[_COMMUNITY_Module 48|Module 48]]
- [[_COMMUNITY_Module 49|Module 49]]
- [[_COMMUNITY_Module 50|Module 50]]
- [[_COMMUNITY_Module 51|Module 51]]
- [[_COMMUNITY_Module 52|Module 52]]
- [[_COMMUNITY_Module 53|Module 53]]
- [[_COMMUNITY_Module 54|Module 54]]
- [[_COMMUNITY_Module 55|Module 55]]
- [[_COMMUNITY_Module 56|Module 56]]
- [[_COMMUNITY_Module 57|Module 57]]
- [[_COMMUNITY_Module 58|Module 58]]
- [[_COMMUNITY_Module 59|Module 59]]
- [[_COMMUNITY_Module 60|Module 60]]
- [[_COMMUNITY_Module 61|Module 61]]
- [[_COMMUNITY_Module 62|Module 62]]
- [[_COMMUNITY_Module 63|Module 63]]
- [[_COMMUNITY_Module 64|Module 64]]
- [[_COMMUNITY_Module 65|Module 65]]
- [[_COMMUNITY_Module 66|Module 66]]
- [[_COMMUNITY_Module 67|Module 67]]
- [[_COMMUNITY_Module 68|Module 68]]
- [[_COMMUNITY_Module 69|Module 69]]
- [[_COMMUNITY_Module 70|Module 70]]
- [[_COMMUNITY_Module 71|Module 71]]
- [[_COMMUNITY_Module 72|Module 72]]
- [[_COMMUNITY_Module 73|Module 73]]
- [[_COMMUNITY_Module 74|Module 74]]
- [[_COMMUNITY_Module 75|Module 75]]
- [[_COMMUNITY_Module 77|Module 77]]
- [[_COMMUNITY_Module 78|Module 78]]
- [[_COMMUNITY_Module 80|Module 80]]
- [[_COMMUNITY_Module 81|Module 81]]
- [[_COMMUNITY_Module 84|Module 84]]

## God Nodes (most connected - your core abstractions)
1. `sequelize` - 27 edges
2. `User` - 23 edges
3. `Order` - 22 edges
4. `SheetMaster` - 19 edges
5. `api` - 18 edges
6. `Design` - 18 edges
7. `OrderItem` - 18 edges
8. `useAuth()` - 16 edges
9. `Color` - 14 edges
10. `authenticate()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Worker Performance Dashboard` --conceptually_related_to--> `Reports Router`  [INFERRED]
  FUTURE_UPDATES.md → server/routes/reports.js
- `Low Stock Auto-Reorder Suggestion` --conceptually_related_to--> `Sheets / Stock Router`  [INFERRED]
  FUTURE_UPDATES.md → server/routes/sheets.js
- `Test Sheets Endpoint Logic` --semantically_similar_to--> `Test Blank Size Logic`  [INFERRED] [semantically similar]
  test_api.js → test_blank_logic.js
- `add_stock script` --semantically_similar_to--> `add_stock_all script`  [INFERRED] [semantically similar]
  add_stock.js → add_stock_all.js
- `add_stock_all script` --semantically_similar_to--> `backfill_stock script`  [INFERRED] [semantically similar]
  add_stock_all.js → backfill_stock.js

## Import Cycles
- None detected.

## Communities (85 total, 17 thin omitted)

### Community 0 - "Admin UI Components"
Cohesion: 0.06
Nodes (35): AdminWorkerControl(), AnalyticsDashboard(), DamageReturns(), STAGE_LABEL, STAGES, STATUS_STYLE, AdminDashboard(), MaterialAnalysis() (+27 more)

### Community 1 - "Stock Adjustment Scripts"
Cohesion: 0.08
Nodes (18): add_stock script, add_stock_all script, { SheetMaster, StockHistory }, quantity, { SheetMaster, StockHistory }, backfill_stock script, { getOptimalBlankSize, getDesignType }, { Order, OrderItem, SheetMaster, StockHistory, Design } (+10 more)

### Community 2 - "Roadmap & Design Logic"
Cohesion: 0.12
Nodes (33): getDesignType, getOptimalBlankSize, Design Logic (Blank Size), Dealer Password First-Login Flow, Dispatch Confirmation / Delivery Proof, Excel Export for Accountant, HPL Door Category Support, Low Stock Auto-Reorder Suggestion (+25 more)

### Community 3 - "App Routing & Auth"
Cohesion: 0.14
Nodes (29): Admin Worker Control, Analytics Dashboard, App Root Router, HomeRedirect (role-based landing), ProtectedRoute (role guard), AuthProvider, useAuth hook, Damage & Returns (+21 more)

### Community 4 - "Data Models (Sequelize)"
Cohesion: 0.14
Nodes (26): DamageReport Model, DesignColor Join Model, Design Model, DoorType Model, Notification Model, OrderItem Model, Order Model, Post Model (+18 more)

### Community 5 - "Reports Dashboard UI"
Cohesion: 0.08
Nodes (3): ReportsDashboard(), STAGE_LABEL, STATUS_STYLE

### Community 6 - "Manager/Worker UI & API Calls"
Cohesion: 0.10
Nodes (23): Manager Analytics, Manager Dashboard, Manager Orders, Worker Dashboard, Worker Login (PIN), API Axios Client, Design Logic Client, GET /orders (+15 more)

### Community 7 - "Schema Fix & Migration Scripts"
Cohesion: 0.09
Nodes (11): { ProductionUnit }, { sequelize }, { sequelize }, sequelize, { User, sequelize }, { DataTypes }, { sequelize }, { DataTypes } (+3 more)

### Community 8 - "Corrected Re-Import (Gujarati)"
Cohesion: 0.13
Nodes (22): bcrypt, cell(), COL, collectFiles(), DIST_ALIAS, distCanonical(), distName(), DRY_RUN (+14 more)

### Community 9 - "Doortype Backfill & Historical Import"
Cohesion: 0.11
Nodes (16): backfill(), { sequelize, OrderItem, Design }, { User, Color, Size, Design, Order, SheetMaster }, Color, Design, DesignColor, DoorType, col() (+8 more)

### Community 10 - "Production Unit Checks"
Cohesion: 0.13
Nodes (10): Order, OrderItem, ProductionUnit, Worker, { ProductionUnit, OrderItem, Order, Design, Color, User }, { sequelize, ProductionUnit, Order }, { Order }, { sequelize, Order, OrderItem, ProductionUnit, User, Worker } (+2 more)

### Community 11 - "User/Dealer Check Scripts"
Cohesion: 0.10
Nodes (11): User, checkBhakti(), checkDealers(), { User }, { sequelize, User, SheetMaster }, { User }, { User }, bcrypt (+3 more)

### Community 12 - "Sheet Import Pipeline"
Cohesion: 0.13
Nodes (20): bcrypt, cell(), COL, collectFiles(), DEALER_MERGE_MAP, DRY_RUN, fs, GUJARATI_NAME_MAP (+12 more)

### Community 13 - "Sheets API & Stock"
Cohesion: 0.13
Nodes (15): backfillStockForExistingOrders(), { authenticate, authorize }, express, { getOptimalBlankSize, getDesignType }, { Op }, router, { SheetMaster, StockHistory, Order, OrderItem, Design }, { getOptimalBlankSize, getDesignType } (+7 more)

### Community 14 - "Client Hooks & Offline Sync"
Cohesion: 0.22
Nodes (10): useSound(), DEFAULT_BLANK_SIZES, getDesignType(), getOptimalBlankSize(), getCachedTasks(), getOfflineQueue(), queueOfflineAction(), removeActionFromQueue() (+2 more)

### Community 15 - "Catalogue / Master Data API"
Cohesion: 0.12
Nodes (14): { authenticate, authorize }, { DoorType, Design, Color, DesignColor, SheetMaster }, express, fs, { getDesignType }, multer, { Op }, path (+6 more)

### Community 16 - "Module 16"
Cohesion: 0.19
Nodes (13): APPLY, CONS, INCLUDE_MEDIUM, lev(), main(), MATRA, { Op }, phonKey() (+5 more)

### Community 17 - "Module 17"
Cohesion: 0.17
Nodes (11): Post, { authenticate, authorize }, express, fs, multer, path, { Post }, router (+3 more)

### Community 18 - "Module 18"
Cohesion: 0.17
Nodes (7): { authenticate, authorize }, express, { getOptimalBlankSize, getDesignType }, MONTHS, { Op }, { Order, OrderItem, Design, Color, User, SheetMaster, StockHistory, Worker, ProcessRecord, DoorType, DamageReport, ProductionUnit, sequelize }, router

### Community 19 - "Module 19"
Cohesion: 0.17
Nodes (11): app, authRoutes, cors, express, masterDataRoutes, orderRoutes, path, postsRoutes (+3 more)

### Community 20 - "Module 20"
Cohesion: 0.22
Nodes (8): authenticate(), authorize(), jwt, { authenticate, authorize }, express, { Op }, { OrderItem, Order, Design, Color, User }, router

### Community 21 - "Module 21"
Cohesion: 0.18
Nodes (8): DamageReport, { authenticate, authorize }, { DamageReport, Order, OrderItem, ProductionUnit, Design, Color, sequelize }, express, { Op }, router, { DataTypes }, { sequelize, DamageReport }

### Community 22 - "Module 22"
Cohesion: 0.20
Nodes (10): ProcessRecord, { authenticate, authorize }, bcrypt, deg2rad(), express, getDistanceFromLatLonInMeters(), { Op }, router (+2 more)

### Community 23 - "Module 23"
Cohesion: 0.20
Nodes (8): SystemSetting, { authenticate, authorize }, express, { getDesignType }, { Op }, { Order, OrderItem, Design, Color, User, DoorType, sequelize, ProductionUnit, Notification, SystemSetting }, router, wa

### Community 24 - "Module 24"
Cohesion: 0.20
Nodes (8): { authenticate, authorize }, bcrypt, express, fs, { Op }, path, router, { User, Order, sequelize }

### Community 25 - "Module 25"
Cohesion: 0.39
Nodes (8): Color model, check_shubham script, check_users script, Import Template Generator, Sequelize DB Connection, Google Sheets Importer, Historical Data Importer, Merge Gujarati Dealers

### Community 26 - "Module 26"
Cohesion: 0.25
Nodes (7): example, headers, outPath, path, wb, ws, XLSX

### Community 27 - "Module 27"
Cohesion: 0.46
Nodes (7): getClient(), notifyDealerOrderDispatched(), notifyDealerOrderReady(), notifyDealerOrderReceived(), notifyDistributorOrderReady(), notifyManufacturerNewOrder(), sendWhatsApp()

### Community 28 - "Module 28"
Cohesion: 0.76
Nodes (7): Check bhaktidevi dealers, Check DB / users diag, Check Design zn-02, Check User/SheetMaster connection, Check Production Units, Check Schema (SheetMasters), Verify Syntax (Dashboard.jsx)

### Community 29 - "Module 29"
Cohesion: 0.29
Nodes (6): Notification, { authenticate }, express, { Notification }, { Op }, router

### Community 30 - "Module 30"
Cohesion: 0.29
Nodes (6): { authenticate }, bcrypt, express, jwt, router, { User }

### Community 31 - "Module 31"
Cohesion: 0.33
Nodes (3): path, { Sequelize }, sequelize

### Community 32 - "Module 32"
Cohesion: 0.40
Nodes (5): fixDatabase(), fs, path, run(), { Sequelize }

### Community 33 - "Module 33"
Cohesion: 1.00
Nodes (6): fix_columns_correct script, fix_database script, fix_db script, fix_schema_items script, fix_timestamps script, fix_unique_constraint script

### Community 35 - "Module 35"
Cohesion: 1.00
Nodes (5): migrate_add_material_type script, migrate_add_phone script, migrate_delivery_damage script, migrate_dispatch_fields script, migrate_sitename script

### Community 36 - "Module 36"
Cohesion: 0.40
Nodes (4): db, dbPath, path, sqlite3

### Community 37 - "Module 37"
Cohesion: 0.40
Nodes (3): { Design, Color }, fs, path

### Community 38 - "Module 38"
Cohesion: 0.40
Nodes (4): db, dbPath, path, sqlite3

### Community 39 - "Module 39"
Cohesion: 0.40
Nodes (4): db, dbPath, path, sqlite3

### Community 40 - "Module 40"
Cohesion: 0.40
Nodes (4): db, dbPath, path, sqlite3

### Community 41 - "Module 41"
Cohesion: 0.40
Nodes (4): db, dbPath, path, sqlite3

### Community 42 - "Module 42"
Cohesion: 0.40
Nodes (4): db, dbPath, path, sqlite3

### Community 43 - "Module 43"
Cohesion: 0.40
Nodes (4): db, dbPath, path, sqlite3

### Community 44 - "Module 44"
Cohesion: 0.40
Nodes (4): db, dbPath, path, sqlite3

### Community 45 - "Module 45"
Cohesion: 0.40
Nodes (4): http, loginData, loginOptions, loginReq

### Community 46 - "Module 46"
Cohesion: 1.00
Nodes (4): Initialize Recovered Stock, Migrate materialType column, Migrate Stock Management, Migrate Stock Management V2

### Community 49 - "Module 49"
Cohesion: 0.50
Nodes (3): Color, { DataTypes }, sequelize

### Community 50 - "Module 50"
Cohesion: 0.50
Nodes (3): DamageReport, { DataTypes }, sequelize

### Community 51 - "Module 51"
Cohesion: 0.50
Nodes (3): { DataTypes }, Design, sequelize

### Community 52 - "Module 52"
Cohesion: 0.50
Nodes (3): { DataTypes }, DesignColor, sequelize

### Community 53 - "Module 53"
Cohesion: 0.50
Nodes (3): { DataTypes }, DoorType, sequelize

### Community 54 - "Module 54"
Cohesion: 0.50
Nodes (3): { DataTypes }, Notification, sequelize

### Community 55 - "Module 55"
Cohesion: 0.50
Nodes (3): { DataTypes }, Order, sequelize

### Community 56 - "Module 56"
Cohesion: 0.50
Nodes (3): { DataTypes }, OrderItem, sequelize

### Community 57 - "Module 57"
Cohesion: 0.50
Nodes (3): { DataTypes }, Post, sequelize

### Community 58 - "Module 58"
Cohesion: 0.50
Nodes (3): { DataTypes }, ProcessRecord, sequelize

### Community 59 - "Module 59"
Cohesion: 0.50
Nodes (3): { DataTypes }, ProductionUnit, sequelize

### Community 60 - "Module 60"
Cohesion: 0.50
Nodes (3): { DataTypes }, sequelize, SheetMaster

### Community 61 - "Module 61"
Cohesion: 0.50
Nodes (3): { DataTypes }, sequelize, StockHistory

### Community 62 - "Module 62"
Cohesion: 0.50
Nodes (3): { DataTypes }, sequelize, SystemSetting

### Community 63 - "Module 63"
Cohesion: 0.50
Nodes (3): { DataTypes }, sequelize, User

### Community 64 - "Module 64"
Cohesion: 0.50
Nodes (3): { DataTypes }, sequelize, Worker

### Community 66 - "Module 66"
Cohesion: 0.50
Nodes (3): http, options, req

### Community 67 - "Module 67"
Cohesion: 0.67
Nodes (3): debug_api script, debug_orders script, debug_query script

## Ambiguous Edges - Review These
- `useIsMobile / useMediaQuery` → `useIsMobile / useMediaQuery`  [AMBIGUOUS]
  client/src/hooks/useMediaQuery.js · relation: references
- `Verify Syntax (Dashboard.jsx)` → `Check DB / users diag`  [AMBIGUOUS]
  client/src/verify_syntax.js · relation: conceptually_related_to

## Knowledge Gaps
- **347 isolated node(s):** `{ SheetMaster, StockHistory }`, `quantity`, `{ SheetMaster, StockHistory }`, `{ sequelize, OrderItem, Design }`, `{ Order, OrderItem, SheetMaster, StockHistory, Design }` (+342 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `useIsMobile / useMediaQuery` and `useIsMobile / useMediaQuery`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Verify Syntax (Dashboard.jsx)` and `Check DB / users diag`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Stock Management` connect `App Routing & Auth` to `Stock Adjustment Scripts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `sequelize` connect `Schema Fix & Migration Scripts` to `Stock Adjustment Scripts`, `Corrected Re-Import (Gujarati)`, `Doortype Backfill & Historical Import`, `Production Unit Checks`, `User/Dealer Check Scripts`, `Sheet Import Pipeline`, `Module 16`, `Module 18`, `Module 19`, `Module 21`, `Module 22`, `Module 23`, `Module 24`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `{ SheetMaster, StockHistory }`, `quantity`, `{ SheetMaster, StockHistory }` to the rest of the system?**
  _347 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06202435312024353 - nodes in this community are weakly interconnected._
- **Should `Stock Adjustment Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.07823613086770982 - nodes in this community are weakly interconnected._