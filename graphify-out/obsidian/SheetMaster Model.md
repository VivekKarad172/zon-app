---
source_file: "server/models/SheetMaster.js"
type: "code"
community: "Data Models (Sequelize)"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Data_Models_Sequelize
---

# SheetMaster Model

## Connections
- [[DamageReport Model]] - `participate_in` [INFERRED]
- [[Master Data Route]] - `operates_on` [EXTRACTED]
- [[Orders Route]] - `operates_on` [EXTRACTED]
- [[StockHistory Model]] - `belongs_to` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Data_Models_Sequelize