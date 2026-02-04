const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(SheetMasters)", (err, columns) => {
    console.log('\n📋 SheetMasters Table Structure:');
    console.table(columns);

    db.all("SELECT * FROM SheetMasters", (err, rows) => {
        console.log('\n📊 Current Data:');
        if (rows && rows.length > 0) {
            console.table(rows);
        } else {
            console.log('  (No data)');
        }
        db.close();
    });
});
