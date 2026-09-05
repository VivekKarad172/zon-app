---
source_file: "server/models/Order.js"
type: "code"
community: "Data Models (Sequelize)"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Data_Models_Sequelize
---

# Order Model

## Connections
- [[Analytics Route]] - `operates_on` [EXTRACTED]
- [[Damage Route]] - `operates_on` [EXTRACTED]
- [[DamageReport Model]] - `has_many` [EXTRACTED]
- [[OrderItem Model]] - `has_many` [EXTRACTED]
- [[Orders Route]] - `operates_on` [EXTRACTED]
- [[ProductionUnit Model]] - `form` [EXTRACTED]
- [[Reimport Corrected Script]] - `operates_on` [INFERRED]
- [[User Model]] - `has_many` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Data_Models_Sequelize