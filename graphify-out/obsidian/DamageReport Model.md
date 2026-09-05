---
source_file: "server/models/DamageReport.js"
type: "code"
community: "Data Models (Sequelize)"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Data_Models_Sequelize
---

# DamageReport Model

## Connections
- [[Damage Route]] - `operates_on` [EXTRACTED]
- [[Order Model]] - `has_many` [EXTRACTED]
- [[SheetMaster Model]] - `participate_in` [INFERRED]
- [[StockHistory Model]] - `participate_in` [INFERRED]

#graphify/code #graphify/EXTRACTED #community/Data_Models_Sequelize