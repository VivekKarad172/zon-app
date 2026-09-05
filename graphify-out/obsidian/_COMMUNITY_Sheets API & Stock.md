---
type: community
cohesion: 0.13
members: 20
---

# Sheets API & Stock

**Cohesion:** 0.13 - loosely connected
**Members:** 20 nodes

## Members
- [[DEFAULT_BLANK_SIZES_1]] - code - server/utils/designLogic.js
- [[backfillStockForExistingOrders()]] - code - backfill_stock.js
- [[designLogic.js]] - code - server/utils/designLogic.js
- [[express_9]] - code - server/routes/sheets.js
- [[getDesignType()_1]] - code - server/utils/designLogic.js
- [[getOptimalBlankSize()_1]] - code - server/utils/designLogic.js
- [[router_8]] - code - server/routes/sheets.js
- [[sheets.js]] - code - server/routes/sheets.js
- [[testAPI()_1]] - code - test_api.js
- [[testCases]] - code - test_blank_logic.js
- [[test_api.js]] - code - test_api.js
- [[test_blank_logic.js]] - code - test_blank_logic.js
- [[{ Op }_8]] - code - server/routes/sheets.js
- [[{ Op }_11]] - code - test_api.js
- [[{ SheetMaster, Order, OrderItem, Design }]] - code - test_api.js
- [[{ SheetMaster, StockHistory, Order, OrderItem, Design }]] - code - server/routes/sheets.js
- [[{ authenticate, authorize }_6]] - code - server/routes/sheets.js
- [[{ getOptimalBlankSize }]] - code - test_blank_logic.js
- [[{ getOptimalBlankSize, getDesignType }_2]] - code - server/routes/sheets.js
- [[{ getOptimalBlankSize, getDesignType }_3]] - code - test_api.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Sheets_API__Stock
SORT file.name ASC
```

## Connections to other communities
- 9 edges to [[_COMMUNITY_Stock Adjustment Scripts]]
- 4 edges to [[_COMMUNITY_Production Unit Checks]]
- 3 edges to [[_COMMUNITY_Module 20]]
- 3 edges to [[_COMMUNITY_Module 23]]
- 3 edges to [[_COMMUNITY_Module 18]]
- 2 edges to [[_COMMUNITY_Doortype Backfill & Historical Import]]
- 2 edges to [[_COMMUNITY_Catalogue  Master Data API]]

## Top bridge nodes
- [[sheets.js]] - degree 18, connects to 4 communities
- [[designLogic.js]] - degree 10, connects to 4 communities
- [[getDesignType()_1]] - degree 8, connects to 4 communities
- [[test_api.js]] - degree 12, connects to 3 communities
- [[getOptimalBlankSize()_1]] - degree 8, connects to 3 communities