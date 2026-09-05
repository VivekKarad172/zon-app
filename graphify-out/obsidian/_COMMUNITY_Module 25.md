---
type: community
cohesion: 0.39
members: 8
---

# Module 25

**Cohesion:** 0.39 - loosely connected
**Members:** 8 nodes

## Members
- [[Color model]] - code - server/models/Color.js
- [[Google Sheets Importer]] - code - server/import_from_sheets.js
- [[Historical Data Importer]] - code - server/import_historical_data.js
- [[Import Template Generator]] - code - server/create_import_template.js
- [[Merge Gujarati Dealers]] - code - server/merge_gujarati_dealers.js
- [[Sequelize DB Connection]] - code - server/config/database.js
- [[check_shubham script]] - code - server/check_shubham.js
- [[check_users script]] - code - server/check_users.js

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Module_25
SORT file.name ASC
```
