/**
 * ZON DOOR — Google Sheets Historical Data Importer
 * ===================================================
 * Designed for YOUR exact sheet format (Sep-2025 to Jun-2026)
 *
 * Sheet column layout (ORDER ENTRY tab):
 *   A: Order No    B: Date        C: Dealer Name   D: Shop Name
 *   E: Foil/Color  F: Type        G: Design        H: Sr.No
 *   I: Width       J: Height      K: Lock          L: Vent
 *   M: Remark      N: Dispatch    O: Foil Pasting
 *
 * HOW TO USE:
 * -----------
 * Step 1 — Download each monthly Google Sheet as .xlsx:
 *   File → Download → Microsoft Excel (.xlsx)
 *   Save all files in ONE folder, e.g.:  D:\historical_data\
 *   Filenames can be anything: SEP-2025.xlsx, OCT-2025.xlsx, etc.
 *
 * Step 2 — Dry run (see what will be created, nothing written):
 *   node server/import_from_sheets.js "D:\historical_data" --dry-run
 *
 * Step 3 — Real import:
 *   node server/import_from_sheets.js "D:\historical_data"
 *
 * Step 4 — Import just one file:
 *   node server/import_from_sheets.js "D:\historical_data\SEP-2025.xlsx"
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { sequelize, User, Order, OrderItem, Design, Color, DoorType } = require('./models');

const DRY_RUN    = process.argv.includes('--dry-run');
const VERBOSE    = process.argv.includes('--verbose');
const INPUT_PATH = process.argv[2];

// ─── COLUMN INDICES (0-based) ────────────────────────────────────────────────
const COL = {
    ORDER_NO:    0,   // A
    DATE:        1,   // B
    DEALER_NAME: 2,   // C
    SHOP_NAME:   3,   // D
    FOIL:        4,   // E  (= color)
    TYPE:        5,   // F  (DIGITAL / CNC / EMBOSS / PLAIN)
    DESIGN:      6,   // G
    SR_NO:       7,   // H  (item sequence within order — for grouping only)
    WIDTH:       8,   // I
    HEIGHT:      9,   // J
    LOCK:        10,  // K
    VENT:        11,  // L
    REMARK:      12,  // M
    DISPATCH:    13,  // N  (COMPLETED = DISPATCHED)
};

// ─── GUJARATI → ENGLISH DEALER NAME MAP ──────────────────────────────────────
// Same dealer entered in Gujarati in some months, English in others.
// All values here get merged into the English canonical name.
const GUJARATI_NAME_MAP = {
    // Gujarati → English canonical name
    'શુભમ કતારગામ':      'SHUBHAM KATARGAM',
    'ભક્તિદેવી વરાછા':   'BHAKTIDEVI',
    'દેવઆશિષ  અંક.':     'DEVASHISH',
    'દેવઆશિષ અંક.':      'DEVASHISH',
    'શ્રીજી રાજકોટ':     'SHREEJI RAJKOT',
    'એન્ટિક ભરૂચ':       'ANTIK',
    'શુભમ નવસારી':        'SHUBHAM NAVSARI',
    'શુભમ વલસાડ':         'SHUBHAM VALSAD',
    'શહાફા ડોર':          'SHAFA DOOR',
    'ઇટાલિક ડોર':         'ITALIC DOOR',
    'મનીષભાઈ':            'MANISHBHAI',
    'મહાલક્ષ્મી':          'MAHALAXMI',
    'આસમા':               'ASMA',
    'સાઈ પ્રવેશ ડોર':     'SAI PARAVESH',
    'ખોડિયાર':             'KHODIYAR',
    // Gujarati shop names for these dealers (normalise as well)
};

// Also merge bare "SHUBHAM" into "SHUBHAM KATARGAM" (early months had no city suffix)
const DEALER_MERGE_MAP = {
    'shubham':           'SHUBHAM KATARGAM',
    'shubham ':          'SHUBHAM KATARGAM',
    'devashish ':        'DEVASHISH',
    'shubham katargam ': 'SHUBHAM KATARGAM',
    'shubham navsari ':  'SHUBHAM NAVSARI',
    'shubham valsad ':   'SHUBHAM VALSAD',
    'bhaktidevi ':       'BHAKTIDEVI',
    'devashish':         'DEVASHISH',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function cell(row, idx) {
    const v = row[idx];
    return (v === undefined || v === null) ? '' : String(v).trim();
}

function parseDate(raw) {
    if (!raw) return new Date();
    if (raw instanceof Date) return raw;
    if (typeof raw === 'number') {                          // Excel serial number
        return new Date(Math.round((raw - 25569) * 86400 * 1000));
    }
    const s = String(raw).trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
        const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
        return new Date(year, +m[2] - 1, +m[1]);
    }
    return new Date(s);
}

function norm(s) { return String(s || '').trim().toLowerCase(); }

// Normalize a dealer name: Gujarati → English, trim trailing spaces
function normDealer(raw) {
    const t = String(raw || '').trim();
    // Check Gujarati map first
    if (GUJARATI_NAME_MAP[t]) return GUJARATI_NAME_MAP[t];
    // Check merge map (English duplicates)
    const lo = t.toLowerCase();
    if (DEALER_MERGE_MAP[lo]) return DEALER_MERGE_MAP[lo];
    return t;
}

// Normalize foil/color: if the foil value looks like a design name or TYPE keyword,
// treat it as WPC (no separate foil for WPC doors)
const TYPE_KEYWORDS = new Set(['digital','cnc','emboss','plain','wpc','pvc']);
function normFoil(foilRaw, designRaw) {
    const f = String(foilRaw || '').trim();
    if (!f) return designRaw ? 'WPC-DEFAULT' : 'PLAIN-DEFAULT';
    // If foil value equals the design number, it's a WPC door with no foil
    if (f.toLowerCase() === String(designRaw || '').toLowerCase()) return 'WPC-DEFAULT';
    // If foil looks like a type keyword (WPC, DIGITAL, etc.) — no foil
    if (TYPE_KEYWORDS.has(f.toLowerCase())) return 'WPC-DEFAULT';
    return f;
}

// Map TYPE column → Design.category in app
const TYPE_TO_CATEGORY = {
    'digital': 'DIGITAL',
    'cnc':     'CNC',
    'emboss':  'EMBOSS',
    'plain':   'PLAIN',
    'wpc':     'PLAIN',   // WPC is a material type, not a category — map to PLAIN
};

// ─── COLLECT EXCEL FILES ─────────────────────────────────────────────────────
function collectFiles(inputPath) {
    if (!inputPath) {
        console.error('❌  Provide a folder or file path as argument.');
        console.error('    Example: node server/import_from_sheets.js "D:\\historical_data"');
        process.exit(1);
    }
    if (!fs.existsSync(inputPath)) {
        console.error(`❌  Path not found: ${inputPath}`);
        process.exit(1);
    }
    const stat = fs.statSync(inputPath);
    if (stat.isFile()) return [inputPath];

    return fs.readdirSync(inputPath)
        .filter(f => /\.(xlsx|xls)$/i.test(f))
        .map(f => path.join(inputPath, f))
        .sort();
}

// ─── PARSE ONE EXCEL FILE ────────────────────────────────────────────────────
function parseFile(filePath) {
    const wb = XLSX.readFile(filePath, { cellDates: false });

    // Look for ORDER ENTRY tab first, fall back to first sheet
    const sheetName =
        wb.SheetNames.find(s => norm(s).includes('order entry')) ||
        wb.SheetNames.find(s => norm(s).includes('order')) ||
        wb.SheetNames[0];

    const ws   = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    console.log(`  📄  ${path.basename(filePath)} — tab "${sheetName}" — ${rows.length - 1} rows`);

    const records = [];

    for (let i = 1; i < rows.length; i++) {    // skip header row
        const row     = rows[i];
        const orderNo = cell(row, COL.ORDER_NO);
        const dealer  = cell(row, COL.DEALER_NAME);

        // Skip blank rows
        if (!orderNo && !dealer) continue;

        const width  = parseFloat(row[COL.WIDTH])  || 0;
        const height = parseFloat(row[COL.HEIGHT]) || 0;
        if (width <= 0 || height <= 0) continue;   // invalid dimension row

        const dispatch = norm(cell(row, COL.DISPATCH));
        const status   = dispatch === 'completed' ? 'DISPATCHED' : 'RECEIVED';

        const rawDesign = cell(row, COL.DESIGN);
        const rawFoil   = cell(row, COL.FOIL);
        const lockVal   = norm(cell(row, COL.LOCK));

        records.push({
            orderNo:    orderNo,
            date:       parseDate(row[COL.DATE]),
            dealerName: normDealer(dealer),            // normalise Gujarati → English
            shopName:   cell(row, COL.SHOP_NAME),
            foil:       normFoil(rawFoil, rawDesign),  // handle WPC with no foil
            type:       cell(row, COL.TYPE),
            design:     rawDesign,
            width,
            height,
            hasLock:    lockVal === 'lock' || lockVal === 'yes',  // both formats
            hasVent:    cell(row, COL.VENT).length > 0,
            remarks:    cell(row, COL.REMARK),
            status,
            sourceFile: path.basename(filePath),
        });
    }
    return records;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🔄  ZON DOOR Historical Import');
    if (DRY_RUN) console.log('⚠️   DRY RUN — nothing will be written\n');

    await sequelize.sync();

    const files   = collectFiles(INPUT_PATH);
    console.log(`\n📁  Found ${files.length} Excel file(s)\n`);

    // ── STEP 1: Parse all files ──────────────────────────────────────────────
    let allRecords = [];
    for (const f of files) {
        allRecords = allRecords.concat(parseFile(f));
    }
    console.log(`\n✅  Total rows parsed: ${allRecords.length}`);

    // ── STEP 2: Discover unique values ───────────────────────────────────────
    const dealerShopMap = {};   // dealerName → Set of shopNames
    const foilCodes     = new Set();
    const designCodes   = new Set();
    const typeMap       = {};   // designCode → category

    for (const r of allRecords) {
        const dn = norm(r.dealerName);
        if (dn) {
            if (!dealerShopMap[dn]) dealerShopMap[dn] = { original: r.dealerName, shops: new Set() };
            if (r.shopName) dealerShopMap[dn].shops.add(r.shopName);
        }
        if (r.foil)   foilCodes.add(r.foil);
        if (r.design) {
            designCodes.add(r.design);
            if (r.type) typeMap[r.design] = r.type;
        }
    }

    console.log(`\n📊  Discovered:`);
    console.log(`    Dealers    : ${Object.keys(dealerShopMap).length}`);
    console.log(`    Foil codes : ${foilCodes.size}  →  ${[...foilCodes].join(', ')}`);
    console.log(`    Designs    : ${designCodes.size}  →  ${[...designCodes].join(', ')}`);

    // Print dealer → shop mapping
    console.log('\n👥  Dealer → Shop mapping from data:');
    for (const [dn, info] of Object.entries(dealerShopMap)) {
        const shops = [...info.shops];
        if (shops.length === 1) {
            console.log(`    ✅  ${info.original.padEnd(25)}  →  ${shops[0]}`);
        } else if (shops.length === 0) {
            console.log(`    ⚠️   ${info.original.padEnd(25)}  →  (no shop name in data)`);
        } else {
            console.log(`    ⚠️   ${info.original.padEnd(25)}  →  MULTIPLE: ${shops.join(' | ')}`);
            console.log(`         (will use most frequent shop name)`);
        }
    }

    if (DRY_RUN) {
        console.log('\n--- DRY RUN complete. Remove --dry-run to run the actual import. ---\n');
        await sequelize.close();
        return;
    }

    // ── STEP 3: Ensure Colors exist (foil codes) ─────────────────────────────
    console.log('\n🎨  Setting up Colors (Foil codes)...');
    const colorMap = {};   // foilCode (lowercase) → Color record
    for (const code of foilCodes) {
        const [color] = await Color.findOrCreate({
            where: { name: code },
            defaults: { name: code, isEnabled: true }
        });
        colorMap[norm(code)] = color;
        console.log(`    ✅  Foil/Color: "${code}" (id=${color.id})`);
    }

    // ── STEP 4: Ensure DoorType exists ───────────────────────────────────────
    console.log('\n🚪  Setting up Door Types...');
    const doorTypePVC = (await DoorType.findOrCreate({ where: { name: 'PVC' }, defaults: { name: 'PVC', isEnabled: true } }))[0];
    const doorTypeWPC = (await DoorType.findOrCreate({ where: { name: 'WPC' }, defaults: { name: 'WPC', isEnabled: true } }))[0];

    // ── STEP 5: Ensure Designs exist ─────────────────────────────────────────
    console.log('\n📐  Setting up Designs...');
    const designMap = {};   // designCode (lowercase) → Design record
    for (const code of designCodes) {
        const rawType   = typeMap[code] || '';
        const category  = TYPE_TO_CATEGORY[norm(rawType)] || 'PLAIN';
        const isWPC     = norm(code).includes('wpc');
        const doorType  = isWPC ? doorTypeWPC : doorTypePVC;

        const [design] = await Design.findOrCreate({
            where: { designNumber: code },
            defaults: {
                designNumber: code,
                category,
                doorTypeId:   doorType.id,
                isEnabled:    true,
            }
        });
        designMap[norm(code)] = design;
        console.log(`    ✅  Design: "${code}" category=${category} (id=${design.id})`);
    }

    // ── STEP 6: Ensure Dealers exist ─────────────────────────────────────────
    console.log('\n👤  Setting up Dealers...');

    // Find a distributor to link dealers to (use first DISTRIBUTOR in system)
    const distributor = await User.findOne({ where: { role: 'DISTRIBUTOR' } });
    if (!distributor) {
        console.warn('    ⚠️  No DISTRIBUTOR found in system — dealers will have no distributor linked.');
        console.warn('       Create a distributor in the app first, then re-run if needed.');
    }

    const dealerMap = {};   // dealerName (lowercase) → User record
    const defaultPwd = await bcrypt.hash('dealer123', 10);   // temporary password

    for (const [dn, info] of Object.entries(dealerShopMap)) {
        // Pick most-frequent shop name
        const shopCounts = {};
        for (const s of info.shops) shopCounts[s] = (shopCounts[s] || 0) + 1;
        const shopName = Object.entries(shopCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || info.original;

        // Try to find existing dealer by name or shop name
        let dealer = await User.findOne({
            where: { role: 'DEALER' },
            // search by name match
        });

        // More targeted search
        const allDealers = await User.findAll({ where: { role: 'DEALER' } });
        dealer = allDealers.find(d =>
            norm(d.name) === dn ||
            norm(d.shopName || '') === norm(shopName) ||
            norm(d.username || '') === dn.replace(/\s+/g, '')
        );

        if (dealer) {
            // Update shop name if not set
            if (!dealer.shopName && shopName) {
                await dealer.update({ shopName });
                console.log(`    🔄  Updated: ${info.original} → shopName = "${shopName}"`);
            } else {
                console.log(`    ✅  Found:   ${info.original} → ${dealer.shopName || '(no shop)'} (id=${dealer.id})`);
            }
            dealerMap[dn] = dealer;
        } else {
            // Create new dealer
            const username = info.original.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const newDealer = await User.create({
                name:          info.original,
                username:      username + '_imp',
                email:         `${username}@import.local`,
                password:      defaultPwd,
                role:          'DEALER',
                shopName,
                isEnabled:     true,
                distributorId: distributor?.id || null,
            });
            dealerMap[dn] = newDealer;
            console.log(`    ➕  Created:  ${info.original} → "${shopName}" (id=${newDealer.id}, pwd: dealer123)`);
        }
    }

    // ── STEP 7: Group records into orders ────────────────────────────────────
    console.log('\n📦  Grouping rows into orders...');

    // Group by (sourceFile + orderNo) — each file's order 283 is independent from another file's 283
    const orderGroups = {};
    for (const r of allRecords) {
        const key = `${r.sourceFile}__${r.orderNo}`;
        if (!orderGroups[key]) {
            orderGroups[key] = {
                orderNo:    r.orderNo,
                date:       r.date,
                dealerName: norm(r.dealerName),
                status:     r.status,
                items:      [],
                sourceFile: r.sourceFile,
            };
        }
        orderGroups[key].items.push(r);
    }

    const groups = Object.values(orderGroups);
    console.log(`    ${groups.length} unique orders across all files`);

    // ── STEP 8: Import orders ────────────────────────────────────────────────
    console.log('\n🚀  Importing orders...\n');

    let created = 0, skipped = 0, failed = 0;

    for (const g of groups) {
        const dealer = dealerMap[g.dealerName];
        if (!dealer) {
            console.warn(`  ⚠️  Skipping order ${g.orderNo} (${g.sourceFile}) — dealer "${g.dealerName}" not found`);
            skipped++;
            continue;
        }

        const t = await sequelize.transaction();
        try {
            const order = await Order.create({
                userId:        dealer.id,
                distributorId: dealer.distributorId || null,
                status:        g.status,
                createdAt:     g.date,
                updatedAt:     g.date,
            }, { transaction: t });

            for (const item of g.items) {
                const design = designMap[norm(item.design)];
                const color  = colorMap[norm(item.foil)];

                if (!design || !color) {
                    if (VERBOSE) console.warn(`    ⚠️  Skipping item — design="${item.design}" color="${item.foil}" not found`);
                    continue;
                }

                await OrderItem.create({
                    orderId:             order.id,
                    designId:            design.id,
                    colorId:             color.id,
                    doorTypeId:          design.doorTypeId || null,
                    width:               item.width,
                    height:              item.height,
                    quantity:            1,     // each row = 1 door
                    remarks:             item.remarks,
                    hasLock:             item.hasLock,
                    hasVent:             item.hasVent,
                    designNameSnapshot:  design.designNumber,
                    colorNameSnapshot:   color.name,
                    designImageSnapshot: design.imageUrl || null,
                    colorImageSnapshot:  color.imageUrl  || null,
                    createdAt:           g.date,
                    updatedAt:           g.date,
                }, { transaction: t });
            }

            await t.commit();
            created++;

            if (created % 25 === 0 || VERBOSE) {
                process.stdout.write(`  ✅  ${created}/${groups.length} orders imported (${g.sourceFile} #${g.orderNo})\r`);
            }
        } catch (err) {
            await t.rollback();
            console.error(`\n  ❌  Order ${g.orderNo} (${g.sourceFile}): ${err.message}`);
            failed++;
        }
    }

    console.log(`\n\n${'─'.repeat(50)}`);
    console.log(`🎉  Import complete!`);
    console.log(`    Orders created : ${created}`);
    console.log(`    Skipped        : ${skipped}`);
    console.log(`    Failed         : ${failed}`);
    console.log(`${'─'.repeat(50)}`);

    if (created > 0) {
        console.log('\n💡  Next steps:');
        console.log('    1. Open the app and check Analytics → should show all historical data');
        console.log('    2. Newly created dealers have password: dealer123');
        console.log('       → Ask them to change it on first login');
        console.log('    3. If any dealers were not matched, check the names above and re-run\n');
    }

    await sequelize.close();
}

main().catch(err => {
    console.error('\n💥  Fatal error:', err.message);
    if (VERBOSE) console.error(err.stack);
    process.exit(1);
});
