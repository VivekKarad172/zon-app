/**
 * ZON DOOR — CORRECTED Historical Re-Import
 * ==========================================
 * Fixes the column mis-mapping:
 *   Column C "DELARER NAME" = DISTRIBUTOR  (not dealer)
 *   Column D "SHOP NAME"    = DEALER       (the shop under that distributor)
 *
 * What it does:
 *   1. Deletes the previous (wrong) import — all orders/items by @import.local
 *      dealers, and those dealer records. Your real data is untouched.
 *   2. Re-imports correctly:
 *        Column C -> Distributor (matched to existing or created)
 *        Column D -> Dealer under that distributor
 *        Blank D  -> a "<Distributor>" direct dealer
 *   3. Continuation rows (same order no, blank C/D) inherit the order's
 *      distributor + dealer.
 *
 * Usage:
 *   node server/reimport_corrected.js "D:\Z-ON DOOR 2024\zon app\historical_data" --dry-run
 *   node server/reimport_corrected.js "D:\Z-ON DOOR 2024\zon app\historical_data"
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize, User, Order, OrderItem, Design, Color, DoorType } = require('./models');

const DRY_RUN = process.argv.includes('--dry-run');
const INPUT_PATH = process.argv[2];

// ─── COLUMNS (0-based) ───────────────────────────────────────────────────────
const COL = { ORDER_NO:0, DATE:1, DISTRIBUTOR:2, DEALER:3, FOIL:4, TYPE:5, DESIGN:6, SR_NO:7, WIDTH:8, HEIGHT:9, LOCK:10, VENT:11, REMARK:12, DISPATCH:13 };

// ─── Gujarati → English (distributor names in Column C) ──────────────────────
const GUJARATI_NAME_MAP = {
    'શુભમ કતારગામ':'SHUBHAM KATARGAM','ભક્તિદેવી વરાછા':'BHAKTIDEVI','દેવઆશિષ  અંક.':'DEVASHISH','દેવઆશિષ અંક.':'DEVASHISH',
    'શ્રીજી રાજકોટ':'SHREEJI RAJKOT','એન્ટિક ભરૂચ':'ANTIK','શુભમ નવસારી':'SHUBHAM NAVSARI','શુભમ વલસાડ':'SHUBHAM VALSAD',
    'શહાફા ડોર':'SHAFA DOOR','ઇટાલિક ડોર':'ITALIC DOOR','મનીષભાઈ':'MANISHBHAI','મહાલક્ષ્મી':'MAHALAXMI','આસમા':'ASMA',
    'સાઈ પ્રવેશ ડોર':'SAI PARAVESH','ખોડિયાર':'KHODIYAR',
};

// Merge variants of distributor name → canonical. Lowercased keys.
// Per user: early "SHUBHAM" and "SHUBHAM KATARGAM" = the one existing "shubham".
// SHUBHAM NAVSARI / SHUBHAM VALSAD stay as their own distributors.
const DIST_ALIAS = {
    'shubham': 'shubham',
    'shubham katargam': 'shubham',
    'devashish': 'devashish',
    'bhaktidevi': 'bhaktidevi',
    'antik': 'Antik Enterprise',
};

// ─── helpers ─────────────────────────────────────────────────────────────────
const cell = (r,i) => (r[i]===undefined||r[i]===null) ? '' : String(r[i]).trim();
const norm = s => String(s||'').trim().toLowerCase().replace(/\s+/g,' ');

function parseDate(raw){
    if(!raw) return new Date();
    if(raw instanceof Date) return raw;
    if(typeof raw==='number') return new Date(Math.round((raw-25569)*86400*1000));
    const s=String(raw).trim();
    const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if(m){const y=m[3].length===2?2000+ +m[3]:+m[3];return new Date(y,+m[2]-1,+m[1]);}
    return new Date(s);
}

// Distributor name: Gujarati→English, trim
function distName(raw){
    const t=String(raw||'').trim();
    if(GUJARATI_NAME_MAP[t]) return GUJARATI_NAME_MAP[t];
    return t;
}
// canonical key for distributor (after alias)
function distCanonical(name){
    const lo=norm(name);
    return DIST_ALIAS[lo] || name; // returns canonical display or the name itself
}

const TYPE_KEYWORDS = new Set(['digital','cnc','emboss','plain','wpc','pvc']);
function normFoil(foilRaw, designRaw){
    const f=String(foilRaw||'').trim();
    if(!f) return designRaw ? 'WPC-DEFAULT' : 'PLAIN-DEFAULT';
    if(f.toLowerCase()===String(designRaw||'').toLowerCase()) return 'WPC-DEFAULT';
    if(TYPE_KEYWORDS.has(f.toLowerCase())) return 'WPC-DEFAULT';
    return f;
}
const TYPE_TO_CATEGORY = {digital:'DIGITAL',cnc:'CNC',emboss:'EMBOSS',plain:'PLAIN',wpc:'PLAIN'};

function slug(s){ return String(s||'x').toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'').slice(0,30) || 'x'; }

function collectFiles(p){
    if(!p){ console.error('❌ Provide folder/file path'); process.exit(1); }
    if(!fs.existsSync(p)){ console.error('❌ Not found: '+p); process.exit(1); }
    if(fs.statSync(p).isFile()) return [p];
    return fs.readdirSync(p).filter(f=>/\.(xlsx|xls)$/i.test(f)).map(f=>path.join(p,f)).sort();
}

// ─── parse one file ──────────────────────────────────────────────────────────
function parseFile(filePath){
    const wb=XLSX.readFile(filePath,{cellDates:false});
    const sheetName = wb.SheetNames.find(s=>norm(s).includes('order entry')) || wb.SheetNames.find(s=>norm(s).includes('order')) || wb.SheetNames[0];
    const ws=wb.Sheets[sheetName];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    console.log(`  📄 ${path.basename(filePath)} — "${sheetName}" — ${rows.length-1} rows`);

    const records=[];
    for(let i=1;i<rows.length;i++){
        const row=rows[i];
        const orderNo=cell(row,COL.ORDER_NO);
        if(!orderNo) continue;                       // every real row has an order no
        const width=parseFloat(row[COL.WIDTH])||0;
        const height=parseFloat(row[COL.HEIGHT])||0;
        if(width<=0||height<=0) continue;            // skip rows without dimensions
        const dispatch=norm(cell(row,COL.DISPATCH));
        const lockVal=norm(cell(row,COL.LOCK));
        const rawDesign=cell(row,COL.DESIGN);
        records.push({
            orderNo,
            date:parseDate(row[COL.DATE]),
            distributorRaw:cell(row,COL.DISTRIBUTOR), // Column C
            dealerRaw:cell(row,COL.DEALER),           // Column D
            foil:normFoil(cell(row,COL.FOIL),rawDesign),
            type:cell(row,COL.TYPE),
            design:rawDesign,
            width,height,
            hasLock:lockVal==='lock'||lockVal==='yes',
            hasVent:cell(row,COL.VENT).length>0,
            remarks:cell(row,COL.REMARK),
            status:dispatch==='completed'?'DISPATCHED':'RECEIVED',
            sourceFile:path.basename(filePath),
        });
    }
    return records;
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main(){
    console.log('\n🔄 CORRECTED Re-Import (C=Distributor, D=Dealer)');
    if(DRY_RUN) console.log('⚠️  DRY RUN — nothing written\n');
    await sequelize.sync();

    // STEP 0: delete previous wrong import ------------------------------------
    const oldDealers = await User.findAll({ where:{ email:{[Op.like]:'%@import.local'} }, attributes:['id'] });
    const oldIds = oldDealers.map(d=>d.id);
    console.log(`\n🧹 Previous import to remove: ${oldIds.length} dealers`);
    if(oldIds.length){
        const oldOrders = await Order.findAll({ where:{ userId:{[Op.in]:oldIds} }, attributes:['id'] });
        const oldOrderIds = oldOrders.map(o=>o.id);
        console.log(`   ${oldOrderIds.length} orders, deleting their items...`);
        if(!DRY_RUN){
            if(oldOrderIds.length) await OrderItem.destroy({ where:{ orderId:{[Op.in]:oldOrderIds} } });
            if(oldOrderIds.length) await Order.destroy({ where:{ id:{[Op.in]:oldOrderIds} } });
            await User.destroy({ where:{ id:{[Op.in]:oldIds} } });
            console.log('   ✅ Old import removed.');
        }
    }

    // STEP 1: parse files -----------------------------------------------------
    const files=collectFiles(INPUT_PATH);
    console.log(`\n📁 ${files.length} file(s)\n`);
    let all=[]; for(const f of files) all=all.concat(parseFile(f));
    console.log(`\n✅ Rows parsed: ${all.length}`);

    // STEP 2: group rows into orders (carry distributor/dealer to blank rows) --
    const groups={};
    for(const r of all){
        const key=`${r.sourceFile}__${r.orderNo}`;
        if(!groups[key]) groups[key]={ orderNo:r.orderNo, date:r.date, status:r.status, distributorRaw:'', dealerRaw:'', items:[], sourceFile:r.sourceFile };
        const g=groups[key];
        if(!g.distributorRaw && r.distributorRaw) g.distributorRaw=r.distributorRaw; // first non-empty
        if(!g.dealerRaw && r.dealerRaw) g.dealerRaw=r.dealerRaw;
        g.items.push(r);
    }
    const orders=Object.values(groups);
    console.log(`📦 ${orders.length} orders grouped`);

    // discover distributors & dealers
    const distSet=new Map();   // canonicalLower -> display
    for(const g of orders){
        const dn=distName(g.distributorRaw);
        if(!dn){ continue; }
        const canon=distCanonical(dn);
        distSet.set(norm(canon), canon);
    }
    console.log(`\n🏢 Distributors in data: ${distSet.size}`);
    [...distSet.values()].forEach(d=>console.log('   • '+d));

    if(DRY_RUN){
        const dealerSet=new Set();
        let direct=0;
        for(const g of orders){
            const dn=distCanonical(distName(g.distributorRaw));
            const shop=g.dealerRaw.trim();
            if(shop) dealerSet.add(norm(dn)+'::'+norm(shop)); else direct++;
        }
        console.log(`\n👤 Unique dealers (shops): ${dealerSet.size}`);
        console.log(`📍 Orders with no shop (→ distributor-direct dealer): ${direct}`);
        console.log('\n--- DRY RUN complete. Remove --dry-run to apply. ---\n');
        await sequelize.close(); return;
    }

    // STEP 3: ensure Colors --------------------------------------------------
    const foilSet=new Set(); const designSet=new Set(); const typeMap={};
    for(const g of orders) for(const it of g.items){
        if(it.foil) foilSet.add(it.foil);
        if(it.design){ designSet.add(it.design); if(it.type) typeMap[it.design]=it.type; }
    }
    console.log('\n🎨 Colors...');
    const colorMap={};
    for(const code of foilSet){ const [c]=await Color.findOrCreate({where:{name:code},defaults:{name:code,isEnabled:true}}); colorMap[norm(code)]=c; }
    console.log(`   ${Object.keys(colorMap).length} colors ready`);

    console.log('🚪 Door types...');
    const dtPVC=(await DoorType.findOrCreate({where:{name:'PVC'},defaults:{name:'PVC',isEnabled:true}}))[0];
    const dtWPC=(await DoorType.findOrCreate({where:{name:'WPC'},defaults:{name:'WPC',isEnabled:true}}))[0];

    console.log('📐 Designs...');
    const designMap={};
    for(const code of designSet){
        const cat=TYPE_TO_CATEGORY[norm(typeMap[code]||'')]||'PLAIN';
        const isWPC=norm(code).includes('wpc');
        const [d]=await Design.findOrCreate({where:{designNumber:code},defaults:{designNumber:code,category:cat,doorTypeId:(isWPC?dtWPC:dtPVC).id,isEnabled:true}});
        designMap[norm(code)]=d;
    }
    console.log(`   ${Object.keys(designMap).length} designs ready`);

    // STEP 4: ensure Distributors --------------------------------------------
    console.log('\n🏢 Distributors...');
    const distMap={};   // canonicalLower -> User
    const distPwd=await bcrypt.hash('dist123',10);
    const existingDists=await User.findAll({ where:{ role:'DISTRIBUTOR' } });
    for(const canon of distSet.values()){
        const key=norm(canon);
        // match existing by exact normalized name
        let d=existingDists.find(x=>norm(x.name)===key);
        if(d){ distMap[key]=d; console.log(`   ✅ matched existing: ${d.name} (id=${d.id})`); continue; }
        // create new distributor
        let uname=slug(canon)+'_d';
        let n=1; while(await User.findOne({where:{username:uname}})){ uname=slug(canon)+'_d'+(n++); }
        d=await User.create({ role:'DISTRIBUTOR', name:canon, username:uname, password:distPwd, isEnabled:true });
        existingDists.push(d);
        distMap[key]=d;
        console.log(`   ➕ created distributor: ${canon} (id=${d.id}, user=${uname}, pwd: dist123)`);
    }

    // STEP 5: import orders + find/create dealers on the fly ------------------
    console.log('\n🚀 Importing orders...\n');
    const dealerCache={};   // distId::shopKey -> User
    const dealerPwd=await bcrypt.hash('dealer123',10);
    let created=0,failed=0,skipped=0;

    async function resolveDealer(dist, shopRaw){
        const shop=String(shopRaw||'').trim();
        const isDirect=!shop;
        const displayName = isDirect ? dist.name : shop;       // blank shop → distributor name (direct)
        const shopKey = isDirect ? '__direct__' : norm(shop);
        const cacheKey = dist.id+'::'+shopKey;
        if(dealerCache[cacheKey]) return dealerCache[cacheKey];
        // try existing dealer under this distributor with same normalized name
        let dealer = await User.findOne({ where:{ role:'DEALER', distributorId:dist.id, name:{[Op.like]:displayName} } });
        if(!dealer){
            let email = slug(displayName)+'_'+dist.id+(isDirect?'_direct':'')+'@import.local';
            let n=1; while(await User.findOne({where:{email}})){ email=slug(displayName)+'_'+dist.id+'_'+(n++)+'@import.local'; }
            dealer = await User.create({
                role:'DEALER', name:displayName, shopName:isDirect?null:shop,
                email, password:dealerPwd, distributorId:dist.id, isEnabled:true,
            });
        }
        dealerCache[cacheKey]=dealer;
        return dealer;
    }

    for(const g of orders){
        const dn=distName(g.distributorRaw);
        if(!dn){ skipped++; continue; }
        const dist=distMap[norm(distCanonical(dn))];
        if(!dist){ skipped++; continue; }

        const t=await sequelize.transaction();
        try{
            const dealer=await resolveDealer(dist, g.dealerRaw);
            const order=await Order.create({
                userId:dealer.id, distributorId:dist.id, status:g.status,
                createdAt:g.date, updatedAt:g.date,
            },{transaction:t});

            for(const it of g.items){
                const design=designMap[norm(it.design)];
                const color=colorMap[norm(it.foil)];
                if(!design||!color) continue;
                await OrderItem.create({
                    orderId:order.id, designId:design.id, colorId:color.id, doorTypeId:design.doorTypeId||null,
                    width:it.width, height:it.height, quantity:1, remarks:it.remarks,
                    hasLock:it.hasLock, hasVent:it.hasVent,
                    designNameSnapshot:design.designNumber, colorNameSnapshot:color.name,
                    designImageSnapshot:design.imageUrl||null, colorImageSnapshot:color.imageUrl||null,
                    createdAt:g.date, updatedAt:g.date,
                },{transaction:t});
            }
            await t.commit(); created++;
            if(created%50===0) process.stdout.write(`   ${created}/${orders.length}...\r`);
        }catch(e){ await t.rollback(); failed++; console.error(`   ❌ order ${g.orderNo} (${g.sourceFile}): ${e.message}`); }
    }

    const dealerCount = await User.count({ where:{ role:'DEALER', email:{[Op.like]:'%@import.local'} } });
    console.log(`\n\n${'─'.repeat(50)}`);
    console.log('🎉 Re-import complete!');
    console.log(`   Orders created : ${created}`);
    console.log(`   Skipped        : ${skipped}`);
    console.log(`   Failed         : ${failed}`);
    console.log(`   Import dealers  : ${dealerCount}`);
    console.log(`${'─'.repeat(50)}\n`);
    await sequelize.close();
}

main().catch(e=>{ console.error('💥 Fatal:',e.message); process.exit(1); });
