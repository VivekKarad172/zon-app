const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Final fix: Setting proper timestamps...\n');

db.serialize(() => {
    db.run(`
        UPDATE SheetMasters 
        SET updatedAt = datetime('now')
        WHERE updatedAt = 'PVC'
    `, function (err) {
        if (err) {
            console.error('❌ Error:', err);
        } else {
            console.log(`✅ Updated ${this.changes} rows`);
        }

        db.all('SELECT * FROM SheetMasters', (err, rows) => {
            console.log('\n📊 Final Result:');
            console.table(rows);
            console.log('\n✨ ALL FIXED! Restart server and try adding WPC sheets now!');
            db.close();
        });
    });
});
