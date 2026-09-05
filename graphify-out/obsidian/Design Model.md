---
source_file: "server/models/Design.js"
type: "code"
community: "Data Models (Sequelize)"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Data_Models_Sequelize
---

# Design Model

## Connections
- [[Analytics Route]] - `operates_on` [EXTRACTED]
- [[Damage Route]] - `operates_on` [EXTRACTED]
- [[DesignColor Join Model]] - `references` [EXTRACTED]
- [[DoorType Model]] - `has_many` [EXTRACTED]
- [[Master Data Route]] - `operates_on` [EXTRACTED]
- [[OrderItem Model]] - `belongs_to` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Data_Models_Sequelize