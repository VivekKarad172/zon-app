---
type: community
cohesion: 0.14
members: 26
---

# Data Models (Sequelize)

**Cohesion:** 0.14 - loosely connected
**Members:** 26 nodes

## Members
- [[Analytics Route]] - code - server/routes/analytics.js
- [[Auth Route]] - code - server/routes/auth.js
- [[Damage Route]] - code - server/routes/damage.js
- [[DamageReport Model]] - code - server/models/DamageReport.js
- [[Design Model]] - code - server/models/Design.js
- [[DesignColor Join Model]] - code - server/models/DesignColor.js
- [[DoorType Model]] - code - server/models/DoorType.js
- [[Master Data Route]] - code - server/routes/masterData.js
- [[Models Index (associations)]] - code - server/models/index.js
- [[Notification Model]] - code - server/models/Notification.js
- [[Notifications Route]] - code - server/routes/notifications.js
- [[Order Model]] - code - server/models/Order.js
- [[OrderItem Model]] - code - server/models/OrderItem.js
- [[Orders Route]] - code - server/routes/orders.js
- [[Post Model]] - code - server/models/Post.js
- [[Posts Route]] - code - server/routes/posts.js
- [[ProcessRecord Model]] - code - server/models/ProcessRecord.js
- [[ProductionUnit Model]] - code - server/models/ProductionUnit.js
- [[Reimport Corrected Script]] - code - server/reimport_corrected.js
- [[Repair Production Units Script]] - code - server/repair_production_units.js
- [[Reset Admin Script]] - code - server/reset_admin.js
- [[SheetMaster Model]] - code - server/models/SheetMaster.js
- [[StockHistory Model]] - code - server/models/StockHistory.js
- [[SystemSetting Model]] - code - server/models/SystemSetting.js
- [[User Model]] - code - server/models/User.js
- [[Worker Model]] - code - server/models/Worker.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Data_Models_Sequelize
SORT file.name ASC
```
