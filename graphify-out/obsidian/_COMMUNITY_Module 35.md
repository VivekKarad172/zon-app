---
type: community
cohesion: 1.00
members: 5
---

# Module 35

**Cohesion:** 1.00 - tightly connected
**Members:** 5 nodes

## Members
- [[migrate_add_material_type script]] - code - server/migrate_add_material_type.js
- [[migrate_add_phone script]] - code - server/migrate_add_phone.js
- [[migrate_delivery_damage script]] - code - server/migrate_delivery_damage.js
- [[migrate_dispatch_fields script]] - code - server/migrate_dispatch_fields.js
- [[migrate_sitename script]] - code - server/migrate_sitename.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Module_35
SORT file.name ASC
```
