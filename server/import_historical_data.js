/**
 * Historical Data Import Script
 * ==============================
 * Usage: node server/import_historical_data.js path/to/data.xlsx
 *
 * Excel file must have a sheet named "Orders" with these columns:
 *   A: date         (DD/MM/YYYY or YYYY-MM-DD)
 *   B: dealer_name  (must match existing dealer shopName or name)
 *   C: design       (designNumber, e.g. P-001 or WPC-010)
 *   D: color        (color name)
 *   E: width        (inches, number)
 *   F: height       (inches, number)
 *   G: quantity     (number)
 *   H: status       (DISPATCHED / RECEIVED / PRODUCTION / READY / CANCELLED)
 *   I: remarks      (optional)
 *
 * Row 1 is the header row — it will be skipped automatically.
 *
 * Run once:  node server/import_historical_data.js "D:\my data\orders_2024.xlsx"
 * Dry run:   node server/import_historical_data.js "D:\my data\orders_2024.xlsx" --dry-run
 */

require('dotenv').config();
const path = require('path');
const XLSX = require('xlsx');
const { sequelize, User, Order, OrderItem, Design, Color, DoorType } = require('./models');

// ── helpers ─────────────────────────────────────────────────────────────────

function parseDate(raw) {
    if (!raw) return new Date();
    if (raw instanceof Date) return raw;
    // Excel serial number
    if (typeof raw === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        return new Date(excelEpoch.getTime() + raw * 86400000);
    }
    // DD/MM/YYYY
    const dmy = String(raw).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
    // YYYY-MM-DD
    return new Date(raw);
}

function col(row, idx) {
    const v = row[idx];
    return v === undefined || v === null ? '' : String(v).trim();
}

const STATUS_VALUES = ['RECEIVED', 'PRODUCTION', 'READY', 'DISPATCHED', 'CANCELLED'];

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
    const filePath = process.argv[2];
    const dryRun = process.argv.includes('--dry-run');

    if (!filePath) {
        console.error('❌  Provide the Excel file path as the first argument.');
        console.error('    Example: node server/import_historical_data.js "D:\\data\\orders_2024.xlsx"');
        process.exit(1);
    }

    if (!require('fs').existsSync(filePath)) {
        console.error(`❌  File not found: ${filePath}`);
        process.exit(1);
    }

    await sequelize.sync();

    // Load reference data once
    const dealers   = await User.findAll({ where: { role: 'DEALER'  } });
    const designs   = await Design.findAll();
    const colors    = await Color.findAll();

    const findDealer = (name) => {
        const n = name.toLowerCase();
        return dealers.find(d =>
            (d.shopName || '').toLowerCase() === n || d.name.toLowerCase() === n
        );
    };
    const findDesign = (num) => {
        const n = num.toLowerCase();
        return designs.find(d => d.designNumber.toLowerCase() === n);
    };
    const findColor = (name) => {
        const n = name.toLowerCase();
        return colors.find(c => c.name.toLowerCase() === n);
    };

    // Read workbook
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames.find(s => s.toLowerCase() === 'orders') || wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    console.log(`📄  Reading sheet "${sheetName}" — ${rows.length - 1} data rows`);
    if (dryRun) console.log('⚠️   DRY RUN — nothing will be written to database\n');

    // Group rows into orders by (date + dealer)
    // Each unique (date+dealer) combination becomes one Order; each row is one OrderItem.
    // If you have a separate order ID column, we can group by that instead.
    const orderGroups = {};

    let skipped = 0;
    let lineNo = 0;

    for (const row of rows.slice(1)) { // skip header
        lineNo++;
        const rawDate   = row[0];
        const dealerRaw = col(row, 1);
        const designRaw = col(row, 2);
        const colorRaw  = col(row, 3);
        const width     = parseFloat(row[4]) || 0;
        const height    = parseFloat(row[5]) || 0;
        const qty       = parseInt(row[6])   || 1;
        const statusRaw = col(row, 7).toUpperCase() || 'DISPATCHED';
        const remarks   = col(row, 8);

        if (!dealerRaw && !designRaw) continue; // blank row

        const date = parseDate(rawDate);
        const dealer = findDealer(dealerRaw);
        const design = findDesign(designRaw);
        const color  = findColor(colorRaw);
        const status = STATUS_VALUES.includes(statusRaw) ? statusRaw : 'DISPATCHED';

        const warns = [];
        if (!dealer) warns.push(`unknown dealer "${dealerRaw}"`);
        if (!design) warns.push(`unknown design "${designRaw}"`);
        if (!color)  warns.push(`unknown color  "${colorRaw}"`);
        if (width <= 0 || height <= 0) warns.push('invalid width/height');

        if (warns.length) {
            console.warn(`  ⚠️  Row ${lineNo + 1}: skipping — ${warns.join(', ')}`);
            skipped++;
            continue;
        }

        // Use date + dealer as grouping key (one order per dealer per day from import data)
        // If your data has an order number, add it as col J and group by that instead.
        const orderKey = `${date.toDateString()}__${dealer.id}__${status}`;
        if (!orderGroups[orderKey]) {
            orderGroups[orderKey] = { date, dealer, status, items: [] };
        }
        orderGroups[orderKey].items.push({ design, color, width, height, qty, remarks });
    }

    const groups = Object.values(orderGroups);
    console.log(`\n✅  Grouped into ${groups.length} orders (${skipped} rows skipped)\n`);

    if (groups.length === 0) {
        console.log('Nothing to import. Check that dealer/design/color names match exactly.');
        process.exit(0);
    }

    if (dryRun) {
        groups.slice(0, 5).forEach((g, i) => {
            console.log(`  Order ${i + 1}: ${g.date.toDateString()} | ${g.dealer.shopName || g.dealer.name} | ${g.status} | ${g.items.length} items`);
        });
        if (groups.length > 5) console.log(`  ... and ${groups.length - 5} more`);
        console.log('\nDry run complete. Remove --dry-run to import.');
        await sequelize.close();
        return;
    }

    // Insert in transaction
    let created = 0;
    for (const g of groups) {
        const t = await sequelize.transaction();
        try {
            const order = await Order.create({
                userId:        g.dealer.id,
                distributorId: g.dealer.distributorId || null,
                status:        g.status,
                createdAt:     g.date,
                updatedAt:     g.date
            }, { transaction: t });

            for (const item of g.items) {
                await OrderItem.create({
                    orderId:             order.id,
                    designId:            item.design.id,
                    colorId:             item.color.id,
                    width:               item.width,
                    height:              item.height,
                    quantity:            item.qty,
                    remarks:             item.remarks,
                    hasLock:             false,
                    hasVent:             false,
                    designNameSnapshot:  item.design.designNumber,
                    colorNameSnapshot:   item.color.name,
                    designImageSnapshot: item.design.imageUrl || null,
                    colorImageSnapshot:  item.color.imageUrl  || null,
                    createdAt:           g.date,
                    updatedAt:           g.date
                }, { transaction: t });
            }

            await t.commit();
            created++;
            if (created % 20 === 0) {
                process.stdout.write(`  Imported ${created}/${groups.length} orders...\r`);
            }
        } catch (err) {
            await t.rollback();
            console.error(`\n  ❌  Failed to create order for ${g.dealer.name} on ${g.date.toDateString()}: ${err.message}`);
        }
    }

    console.log(`\n\n🎉  Done! Imported ${created} historical orders.`);
    await sequelize.close();
}

main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
