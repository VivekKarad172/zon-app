const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Checking for stranded backup tables...');

    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_backup'", (err, tables) => {
        if (err) {
            console.error('Error listing tables:', err);
            db.close(); // Close DB on error
            return;
        }

        if (tables.length === 0) {
            console.log('No backup tables found.');
            db.close(); // Close DB if no tables found
            console.log('Cleanup complete.');
        } else {
            console.log(`Found ${tables.length} backup tables:`, tables.map(t => t.name));
            let droppedCount = 0;
            tables.forEach(table => {
                console.log(`Dropping ${table.name}...`);
                db.run(`DROP TABLE IF EXISTS ${table.name}`, (err) => {
                    if (err) console.error(`Failed to drop ${table.name}:`, err);
                    else console.log(`Dropped ${table.name} successfully.`);

                    droppedCount++;
                    if (droppedCount === tables.length) {
                        db.close();
                        console.log('Cleanup complete.');
                    }
                });
            });
        }
    });
});
