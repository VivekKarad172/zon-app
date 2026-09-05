---
type: community
cohesion: 0.13
members: 22
---

# Production Unit Checks

**Cohesion:** 0.13 - loosely connected
**Members:** 22 nodes

## Members
- [[Order_1]] - code - server/models/index.js
- [[OrderItem_1]] - code - server/models/index.js
- [[ProductionUnit_1]] - code - server/models/index.js
- [[Worker_1]] - code - server/models/index.js
- [[check()_2]] - code - server/check_units.js
- [[checkProductionUnits()]] - code - server/check_production_units.js
- [[check_production_units.js]] - code - server/check_production_units.js
- [[check_units.js]] - code - server/check_units.js
- [[debug()]] - code - server/debug_orders.js
- [[debug_orders.js]] - code - server/debug_orders.js
- [[debug_query.js]] - code - server/debug_query.js
- [[fix()]] - code - server/fix_factory_data.js
- [[fix_factory_data.js]] - code - server/fix_factory_data.js
- [[repairProductionUnits()]] - code - server/repair_production_units.js
- [[repair_production_units.js]] - code - server/repair_production_units.js
- [[testQuery()]] - code - server/debug_query.js
- [[{ Order }]] - code - server/debug_orders.js
- [[{ ProductionUnit, OrderItem, Order }]] - code - server/repair_production_units.js
- [[{ ProductionUnit, OrderItem, Order, Design, Color, User }]] - code - server/check_production_units.js
- [[{ sequelize, Order, OrderItem, ProductionUnit, User, Worker }]] - code - server/debug_query.js
- [[{ sequelize, Order, OrderItem, ProductionUnit, Worker }]] - code - server/fix_factory_data.js
- [[{ sequelize, ProductionUnit, Order }]] - code - server/check_units.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Production_Unit_Checks
SORT file.name ASC
```

## Connections to other communities
- 12 edges to [[_COMMUNITY_Stock Adjustment Scripts]]
- 8 edges to [[_COMMUNITY_Doortype Backfill & Historical Import]]
- 4 edges to [[_COMMUNITY_Schema Fix & Migration Scripts]]
- 4 edges to [[_COMMUNITY_Module 18]]
- 4 edges to [[_COMMUNITY_Sheets API & Stock]]
- 4 edges to [[_COMMUNITY_Module 22]]
- 3 edges to [[_COMMUNITY_Module 21]]
- 3 edges to [[_COMMUNITY_Module 23]]
- 2 edges to [[_COMMUNITY_UserDealer Check Scripts]]
- 2 edges to [[_COMMUNITY_Sheet Import Pipeline]]
- 2 edges to [[_COMMUNITY_Module 20]]
- 2 edges to [[_COMMUNITY_Corrected Re-Import (Gujarati)]]
- 1 edge to [[_COMMUNITY_Module 16]]
- 1 edge to [[_COMMUNITY_Module 24]]

## Top bridge nodes
- [[Order_1]] - degree 22, connects to 12 communities
- [[OrderItem_1]] - degree 18, connects to 10 communities
- [[ProductionUnit_1]] - degree 11, connects to 6 communities
- [[check_production_units.js]] - degree 9, connects to 3 communities
- [[debug_query.js]] - degree 9, connects to 3 communities