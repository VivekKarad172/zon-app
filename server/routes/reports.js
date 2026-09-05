const express = require('express');
const router = express.Router();
const { Order, OrderItem, Design, Color, User, SheetMaster, StockHistory, Worker, ProcessRecord, DoorType, DamageReport, ProductionUnit, sequelize } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');
const { getOptimalBlankSize, getDesignType } = require('../utils/designLogic');

/**
 * REPORTS API
 * ===========
 * DB-agnostic (SQLite local / Postgres prod): all month grouping & aggregation
 * is done in JS, never in SQL, to avoid dialect differences.
 *
 * Endpoints (all admin/manager):
 *   GET /api/reports/sales-monthly      → month-wise orders + doors (+ optional dealer/distributor filter)
 *   GET /api/reports/party-activity     → every distributor & dealer with last-order + cold/active status (revival list)
 *   GET /api/reports/product-mix        → most-used designs, colors, and design+color combos
 *   GET /api/reports/stock              → current stock, low stock, consumption
 *   GET /api/reports/summary            → headline KPIs
 */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (key) => { const [y, m] = key.split('-'); return `${MONTHS[+m - 1]} ${y}`; };

// Build a createdAt where-clause from ?from=&to= (YYYY-MM-DD)
function dateWhere(q) {
    const w = {};
    if (q.from && q.to) w.createdAt = { [Op.between]: [new Date(q.from + 'T00:00:00.000Z'), new Date(q.to + 'T23:59:59.999Z')] };
    else if (q.from) w.createdAt = { [Op.gte]: new Date(q.from + 'T00:00:00.000Z') };
    else if (q.to) w.createdAt = { [Op.lte]: new Date(q.to + 'T23:59:59.999Z') };
    return w;
}

const sumQty = (items) => items.reduce((s, it) => s + (parseInt(it.quantity) || 0), 0);

// ─── 1. MONTHLY SALES ────────────────────────────────────────────────────────
router.get('/sales-monthly', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const where = { ...dateWhere(req.query) };
        if (req.query.distributorId) where.distributorId = req.query.distributorId;
        if (req.query.dealerId) where.userId = req.query.dealerId;
        // Exclude cancelled from sales totals
        where.status = { [Op.ne]: 'CANCELLED' };

        const orders = await Order.findAll({
            where,
            include: [{ model: OrderItem, attributes: ['quantity'] }],
            attributes: ['id', 'createdAt', 'status']
        });

        const byMonth = {};
        for (const o of orders) {
            const key = monthKey(new Date(o.createdAt));
            if (!byMonth[key]) byMonth[key] = { month: key, label: monthLabel(key), orders: 0, doors: 0 };
            byMonth[key].orders += 1;
            byMonth[key].doors += sumQty(o.OrderItems || []);
        }

        const series = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));

        // Month-over-month change for the "which month dropped" insight
        for (let i = 0; i < series.length; i++) {
            const prev = series[i - 1];
            series[i].doorChangePct = prev && prev.doors > 0
                ? Math.round(((series[i].doors - prev.doors) / prev.doors) * 100)
                : null;
        }

        const totalOrders = series.reduce((s, m) => s + m.orders, 0);
        const totalDoors = series.reduce((s, m) => s + m.doors, 0);
        const best = series.reduce((b, m) => (!b || m.doors > b.doors ? m : b), null);
        const worst = series.reduce((w, m) => (!w || m.doors < w.doors ? m : w), null);

        res.json({ series, totals: { orders: totalOrders, doors: totalDoors, months: series.length }, best, worst });
    } catch (e) {
        console.error('sales-monthly error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ─── 2. PARTY ACTIVITY / CHURN (revival list) ────────────────────────────────
// Status thresholds (days since last order):
//   active  <= 30,  cooling 31-60,  cold 61-120,  dormant > 120,  never = no orders
router.get('/party-activity', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const role = req.query.role === 'DISTRIBUTOR' ? 'DISTRIBUTOR' : 'DEALER';
        const now = new Date();

        const users = await User.findAll({
            where: { role },
            attributes: ['id', 'name', 'shopName', 'city', 'phone', 'isEnabled', 'distributorId'],
            include: role === 'DEALER'
                ? [{ model: User, as: 'Distributor', attributes: ['name'] }]
                : []
        });

        // Pull all non-cancelled orders once, keyed by the relevant party id
        const idField = role === 'DISTRIBUTOR' ? 'distributorId' : 'userId';
        const orders = await Order.findAll({
            where: { status: { [Op.ne]: 'CANCELLED' } },
            include: [{ model: OrderItem, attributes: ['quantity'] }],
            attributes: ['id', 'createdAt', idField]
        });

        const agg = {}; // partyId -> { orders, doors, first, last }
        for (const o of orders) {
            const pid = o[idField];
            if (pid == null) continue;
            if (!agg[pid]) agg[pid] = { orders: 0, doors: 0, first: null, last: null };
            const a = agg[pid];
            a.orders += 1;
            a.doors += sumQty(o.OrderItems || []);
            const d = new Date(o.createdAt);
            if (!a.first || d < a.first) a.first = d;
            if (!a.last || d > a.last) a.last = d;
        }

        const statusOf = (days) => {
            if (days == null) return 'never';
            if (days <= 30) return 'active';
            if (days <= 60) return 'cooling';
            if (days <= 120) return 'cold';
            return 'dormant';
        };

        const rows = users.map(u => {
            const a = agg[u.id];
            const days = a && a.last ? Math.floor((now - a.last) / 86400000) : null;
            return {
                id: u.id,
                name: u.name,
                shopName: u.shopName || null,
                city: u.city || null,
                phone: u.phone || null,
                isEnabled: u.isEnabled,
                distributor: role === 'DEALER' ? (u.Distributor?.name || null) : null,
                totalOrders: a ? a.orders : 0,
                totalDoors: a ? a.doors : 0,
                firstOrder: a?.first || null,
                lastOrder: a?.last || null,
                daysSinceLast: days,
                status: statusOf(days)
            };
        });

        // Sort: parties WITH history first, by daysSinceLast desc (most cold first → revival priority)
        rows.sort((a, b) => {
            if ((b.totalOrders > 0) !== (a.totalOrders > 0)) return b.totalOrders - a.totalOrders > 0 ? 1 : -1;
            return (b.daysSinceLast || -1) - (a.daysSinceLast || -1);
        });

        const counts = rows.reduce((c, r) => { c[r.status] = (c[r.status] || 0) + 1; return c; }, {});
        res.json({ role, rows, counts, generatedAt: now });
    } catch (e) {
        console.error('party-activity error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ─── 3. PRODUCT MIX (designs / colors / combos) ──────────────────────────────
router.get('/product-mix', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const orderWhere = { ...dateWhere(req.query), status: { [Op.ne]: 'CANCELLED' } };
        const orders = await Order.findAll({ where: orderWhere, attributes: ['id'] });
        const orderIds = orders.map(o => o.id);
        if (orderIds.length === 0) return res.json({ topDesigns: [], topColors: [], topCombos: [], totalDoors: 0 });

        const items = await OrderItem.findAll({
            where: { orderId: { [Op.in]: orderIds } },
            attributes: ['quantity', 'designNameSnapshot', 'colorNameSnapshot']
        });

        const designs = {}, colors = {}, combos = {};
        let totalDoors = 0;
        for (const it of items) {
            const q = parseInt(it.quantity) || 0;
            totalDoors += q;
            const d = (it.designNameSnapshot || 'Unknown').trim();
            const c = (it.colorNameSnapshot || 'Unknown').trim();
            designs[d] = (designs[d] || 0) + q;
            colors[c] = (colors[c] || 0) + q;
            const combo = `${d}  +  ${c}`;
            combos[combo] = (combos[combo] || 0) + q;
        }

        const top = (obj, n) => Object.entries(obj)
            .map(([name, doors]) => ({ name, doors, pct: totalDoors ? Math.round((doors / totalDoors) * 1000) / 10 : 0 }))
            .sort((a, b) => b.doors - a.doors)
            .slice(0, n);

        res.json({
            topDesigns: top(designs, 25),
            topColors: top(colors, 25),
            topCombos: top(combos, 30),
            totalDoors,
            uniqueDesigns: Object.keys(designs).length,
            uniqueColors: Object.keys(colors).length
        });
    } catch (e) {
        console.error('product-mix error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ─── 4. STOCK REPORT ─────────────────────────────────────────────────────────
router.get('/stock', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const sheets = await SheetMaster.findAll({ order: [['materialType', 'ASC'], ['width', 'ASC'], ['height', 'ASC']] });

        // Consumption totals from StockHistory (negative changes = consumption)
        let history = [];
        try { history = await StockHistory.findAll({ attributes: ['sheetId', 'change', 'type'] }); } catch (_) { history = []; }
        const consumedBySheet = {};
        for (const h of history) {
            if (h.change < 0) consumedBySheet[h.sheetId] = (consumedBySheet[h.sheetId] || 0) + Math.abs(h.change);
        }

        const LOW = 20; // low-stock threshold (sheets)
        const rows = sheets.map(s => ({
            id: s.id,
            size: `${s.width} x ${s.height}`,
            materialType: s.materialType,
            currentStock: s.currentStock,
            consumed: consumedBySheet[s.id] || 0,
            isEnabled: s.isEnabled,
            low: s.currentStock <= LOW
        }));

        const lowStock = rows.filter(r => r.low && r.isEnabled);
        const totalStock = rows.reduce((s, r) => s + (r.currentStock || 0), 0);
        const totalConsumed = rows.reduce((s, r) => s + r.consumed, 0);

        res.json({ rows, lowStock, totals: { sheets: rows.length, totalStock, totalConsumed }, lowThreshold: LOW });
    } catch (e) {
        console.error('stock report error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ─── 5. SUMMARY KPIs ─────────────────────────────────────────────────────────
router.get('/summary', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const now = new Date();
        const orders = await Order.findAll({
            where: { status: { [Op.ne]: 'CANCELLED' } },
            include: [{ model: OrderItem, attributes: ['quantity'] }],
            attributes: ['id', 'createdAt', 'userId', 'distributorId']
        });

        let totalDoors = 0;
        const dealerLast = {}, distLast = {};
        for (const o of orders) {
            totalDoors += sumQty(o.OrderItems || []);
            const d = new Date(o.createdAt);
            if (o.userId != null && (!dealerLast[o.userId] || d > dealerLast[o.userId])) dealerLast[o.userId] = d;
            if (o.distributorId != null && (!distLast[o.distributorId] || d > distLast[o.distributorId])) distLast[o.distributorId] = d;
        }

        const coldCount = (map) => Object.values(map).filter(d => Math.floor((now - d) / 86400000) > 60).length;

        const totalDealers = await User.count({ where: { role: 'DEALER' } });
        const totalDistributors = await User.count({ where: { role: 'DISTRIBUTOR' } });

        res.json({
            totalOrders: orders.length,
            totalDoors,
            totalDealers,
            totalDistributors,
            activeDealers: Object.keys(dealerLast).length,
            coldDealers: coldCount(dealerLast),
            coldDistributors: coldCount(distLast)
        });
    } catch (e) {
        console.error('summary error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ─── 6. WORKER PRODUCTIVITY (output, not wages) ──────────────────────────────
router.get('/worker-productivity', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const now = new Date();
        const from = req.query.from ? new Date(req.query.from + 'T00:00:00.000Z') : new Date(now.getTime() - 30 * 86400000);
        const to = req.query.to ? new Date(req.query.to + 'T23:59:59.999Z') : now;

        const records = await ProcessRecord.findAll({
            where: { timestamp: { [Op.between]: [from, to] } },
            include: [{ model: Worker, attributes: ['name', 'role'] }],
            attributes: ['id', 'workerId', 'stage', 'timestamp']
        });

        const STAGES = ['PVC_CUT', 'FOIL_PASTING', 'EMBOSS', 'DOOR_MAKING', 'PACKING'];
        const byWorker = {};
        const byDay = {};
        for (const r of records) {
            const name = r.Worker?.name || `#${r.workerId}`;
            if (!byWorker[name]) byWorker[name] = { name, role: r.Worker?.role || '-', total: 0, stages: {} };
            byWorker[name].total += 1;
            byWorker[name].stages[r.stage] = (byWorker[name].stages[r.stage] || 0) + 1;

            const day = new Date(r.timestamp).toISOString().slice(0, 10);
            byDay[day] = (byDay[day] || 0) + 1;
        }

        const leaderboard = Object.values(byWorker).sort((a, b) => b.total - a.total);
        const daily = Object.entries(byDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
        const stageTotals = {};
        for (const s of STAGES) stageTotals[s] = leaderboard.reduce((sum, w) => sum + (w.stages[s] || 0), 0);

        res.json({
            from, to,
            totalActions: records.length,
            activeWorkers: leaderboard.length,
            leaderboard,
            daily,
            stageTotals
        });
    } catch (e) {
        console.error('worker-productivity error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ─── 7. MATERIAL REQUIREMENT / REORDER PLANNING (quantities, not money) ───────
router.get('/material-requirement', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: { status: { [Op.in]: ['RECEIVED', 'PRODUCTION'] } },
            include: [{ model: OrderItem, include: [{ model: Design, attributes: ['designNumber', 'category'] }] }]
        });

        const sheets = await SheetMaster.findAll({ where: { isEnabled: true } });
        const sheetsByMaterial = { PVC: sheets.filter(s => s.materialType === 'PVC'), WPC: sheets.filter(s => s.materialType === 'WPC') };

        // needed[key] = { size, material, doors, sheetsNeeded }
        const needed = {};
        let pendingDoors = 0, unmatched = 0;

        for (const o of orders) {
            for (const item of (o.OrderItems || [])) {
                const q = parseInt(item.quantity) || 0;
                pendingDoors += q;
                const designRef = item.Design?.designNumber || item.designNameSnapshot || '';
                const material = String(designRef).toUpperCase().startsWith('WPC') ? 'WPC' : 'PVC';
                const designType = item.Design?.category || getDesignType(designRef);
                const blank = getOptimalBlankSize(item.width, item.height, designType, sheetsByMaterial[material]);
                if (!blank || blank === 'No match' || blank === 'Missing Dimensions') { unmatched += q; continue; }
                const [w, , h] = blank.split(' ');
                const key = `${material}|${w}x${h}`;
                if (!needed[key]) needed[key] = { material, size: `${w} x ${h}`, width: parseFloat(w), height: parseFloat(h), doors: 0, sheetsNeeded: 0 };
                needed[key].doors += q;
                needed[key].sheetsNeeded += q * 2; // 2 sheets per door (front+back)
            }
        }

        // match to current stock
        const rows = Object.values(needed).map(n => {
            const sheet = sheets.find(s => s.materialType === n.material && parseFloat(s.width) === n.width && parseFloat(s.height) === n.height);
            const inStock = sheet ? sheet.currentStock : 0;
            const toBuy = Math.max(0, n.sheetsNeeded - inStock);
            return { ...n, inStock, toBuy, shortfall: toBuy > 0 };
        }).sort((a, b) => b.toBuy - a.toBuy);

        res.json({
            pendingOrders: orders.length,
            pendingDoors,
            unmatchedDoors: unmatched,
            rows,
            totalSheetsNeeded: rows.reduce((s, r) => s + r.sheetsNeeded, 0),
            totalToBuy: rows.reduce((s, r) => s + r.toBuy, 0)
        });
    } catch (e) {
        console.error('material-requirement error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ─── 8. FULL DATA BACKUP (JSON export of everything) ─────────────────────────
router.get('/backup', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const [users, doorTypes, designs, colors, orders, orderItems, workers, sheets, damage] = await Promise.all([
            User.findAll({ attributes: { exclude: ['password'] } }),
            DoorType.findAll(), Design.findAll(), Color.findAll(),
            Order.findAll(), OrderItem.findAll(), Worker.findAll({ attributes: { exclude: ['pinCode'] } }),
            SheetMaster.findAll(), DamageReport.findAll()
        ]);
        const backup = {
            app: 'ZON-DOOR', version: 1, generatedAt: new Date().toISOString(),
            counts: {
                users: users.length, doorTypes: doorTypes.length, designs: designs.length, colors: colors.length,
                orders: orders.length, orderItems: orderItems.length, workers: workers.length, sheets: sheets.length, damageReports: damage.length
            },
            data: { users, doorTypes, designs, colors, orders, orderItems, workers, sheets, damageReports: damage }
        };
        const fname = `zon-door-backup-${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
        res.send(JSON.stringify(backup, null, 2));
    } catch (e) {
        console.error('backup error:', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
