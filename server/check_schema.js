const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking SheetMasters table structure...\n');

db.serialize(() => {
    // Get table structure
    db.all("PRAGMA table_info(SheetMasters)", (err, columns) => {
        if (err) {
            console.error('Error:', err);
            db.close();
            return;
        }

        console.log('📋 Table Structure:');
        console.table(columns);

        // Get all data
        db.all("SELECT * FROM SheetMasters", (err, rows) => {
            console.log('\n📊 Current Data:');
            if (rows && rows.length > 0) {
                console.table(rows);
            } else {
                console.log('  (No data)');
            }

            // Try to insert a test WPC record
            console.log('\n🧪 Testing WPC insert...');
            db.run(
                "INSERT INTO SheetMasters (width, height, materialType, isEnabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
                [28, 72, 'WPC', 1],
                function (err) {
                    if (err) {
                        console.error('❌ Test insert failed:', err.message);
                    } else {
                        console.log('✅ Test insert succeeded! ID:', this.lastID);
                        // Delete test record
                        db.run("DELETE FROM SheetMasters WHERE id = ?", [this.lastID]);
                    }
                    db.close();
                }
            );
        });
    });
});
