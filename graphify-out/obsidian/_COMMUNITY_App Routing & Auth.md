---
type: community
cohesion: 0.14
members: 29
---

# App Routing & Auth

**Cohesion:** 0.14 - loosely connected
**Members:** 29 nodes

## Members
- [[orders API]] - code - server/routes/orders.js
- [[users API]] - code - server/routes/users.js
- [[workers API]] - code - server/routes/workers.js
- [[Admin Dashboard]] - code - client/src/pages/admin/Dashboard.jsx
- [[Admin Worker Control]] - code - client/src/pages/admin/AdminWorkerControl.jsx
- [[Analytics Dashboard]] - code - client/src/pages/admin/AnalyticsDashboard.jsx
- [[App Entry  Provider Tree]] - code - client/src/main.jsx
- [[App Root Router]] - code - client/src/App.jsx
- [[AuthProvider]] - code - client/src/context/AuthContext.jsx
- [[Damage & Returns]] - code - client/src/pages/admin/DamageReturns.jsx
- [[Dealer Dashboard (wrapper)]] - code - client/src/pages/dealer/Dashboard.jsx
- [[Dealer Desktop Dashboard]] - code - client/src/pages/dealer/DesktopDashboard.jsx
- [[Dealer Mobile Dashboard]] - code - client/src/pages/dealer/MobileDashboard.jsx
- [[Distributor Dashboard (wrapper)]] - code - client/src/pages/distributor/Dashboard.jsx
- [[Distributor Desktop Dashboard]] - code - client/src/pages/distributor/DesktopDashboard.jsx
- [[Distributor Mobile Dashboard]] - code - client/src/pages/distributor/MobileDashboard.jsx
- [[HomeRedirect (role-based landing)]] - code - client/src/App.jsx
- [[Login Page]] - code - client/src/pages/Login.jsx
- [[Logo  DoorMark]] - code - client/src/components/Logo.jsx
- [[Material Analysis]] - code - client/src/pages/admin/MaterialAnalysis.jsx
- [[POST authdealer-login endpoint]] - code - server/routes/auth.js
- [[POST authlogin endpoint]] - code - server/routes/auth.js
- [[Profile Page]] - code - client/src/pages/Profile.jsx
- [[ProtectedRoute (role guard)]] - code - client/src/App.jsx
- [[Reports Dashboard]] - code - client/src/pages/admin/ReportsDashboard.jsx
- [[Shared Sidebar]] - code - client/src/components/Sidebar.jsx
- [[Stock Management]] - code - client/src/pages/admin/StockManagement.jsx
- [[useAuth hook]] - code - client/src/context/AuthContext.jsx
- [[useIsMobile  useMediaQuery]] - code - client/src/hooks/useMediaQuery.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/App_Routing__Auth
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Stock Adjustment Scripts]]

## Top bridge nodes
- [[Stock Management]] - degree 2, connects to 1 community