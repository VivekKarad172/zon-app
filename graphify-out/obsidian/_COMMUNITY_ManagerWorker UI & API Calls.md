---
type: community
cohesion: 0.10
members: 23
---

# Manager/Worker UI & API Calls

**Cohesion:** 0.10 - loosely connected
**Members:** 23 nodes

## Members
- [[API Axios Client]] - code - client/src/utils/api.js
- [[Design Logic Client]] - code - client/src/utils/designLogicClient.js
- [[Fix SQLite All (foil cols)]] - code - fix_sqlite_all.js
- [[Fix SQLite Columns (doorTypeId)]] - code - fix_sqlite_columns.js
- [[Fix Schema (ProductionUnit sync)]] - code - fix_schema.js
- [[GET orders]] - code - client/src/pages/manager/ManagerOrders.jsx
- [[GET ordersanalytics]] - code - client/src/pages/manager/ManagerAnalytics.jsx
- [[GET workershistory]] - code - client/src/pages/worker/WorkerDashboard.jsx
- [[GET workerspublic]] - code - client/src/pages/worker/WorkerLogin.jsx
- [[GET workerssheets]] - code - client/src/pages/worker/WorkerDashboard.jsx
- [[GET workerstasks]] - code - client/src/pages/worker/WorkerDashboard.jsx
- [[Manager Analytics]] - code - client/src/pages/manager/ManagerAnalytics.jsx
- [[Manager Dashboard]] - code - client/src/pages/manager/ManagerDashboard.jsx
- [[Manager Orders]] - code - client/src/pages/manager/ManagerOrders.jsx
- [[Migrate FrontBack Pick columns]] - code - migrate_pick_columns.js
- [[Offline Sync Utility]] - code - client/src/utils/offlineSync.js
- [[POST workerscomplete]] - code - client/src/pages/worker/WorkerDashboard.jsx
- [[POST workerscomplete-batch]] - code - client/src/pages/worker/WorkerDashboard.jsx
- [[POST workerslogin]] - code - client/src/pages/worker/WorkerLogin.jsx
- [[POST workersreject]] - code - client/src/pages/worker/WorkerDashboard.jsx
- [[POST workersundo]] - code - client/src/pages/worker/WorkerDashboard.jsx
- [[Worker Dashboard]] - code - client/src/pages/worker/WorkerDashboard.jsx
- [[Worker Login (PIN)]] - code - client/src/pages/worker/WorkerLogin.jsx

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Manager/Worker_UI__API_Calls
SORT file.name ASC
```
