---
source_file: "server/models/ProductionUnit.js"
type: "code"
community: "Data Models (Sequelize)"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Data_Models_Sequelize
---

# ProductionUnit Model

## Connections
- [[Damage Route]] - `operates_on` [EXTRACTED]
- [[Order Model]] - `form` [EXTRACTED]
- [[OrderItem Model]] - `belongs_to` [EXTRACTED]
- [[Orders Route]] - `operates_on` [EXTRACTED]
- [[ProcessRecord Model]] - `participate_in` [EXTRACTED]
- [[Repair Production Units Script]] - `operates_on` [INFERRED]
- [[Worker Model]] - `participate_in` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Data_Models_Sequelize