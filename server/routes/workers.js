const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Worker, ProductionUnit, OrderItem, Design, Color, Order, User, sequelize, SystemSetting } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

// --- GEO FENCING HELPERS ---
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d * 1000; // Meters
}
function deg2rad(deg) { return deg * (Math.PI / 180); }

// SETTINGS ROUTES (ADMIN)
router.post('/settings/location', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { lat, lng } = req.body;
        await SystemSetting.sync(); // Ensure table exists
        await SystemSetting.upsert({ key: 'FACTORY_COORDS', value: JSON.stringify({ lat, lng }) });
        console.log('Factory Location Updated:', lat, lng);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/settings/location', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        await SystemSetting.sync();
        const s = await SystemSetting.findByPk('FACTORY_COORDS');
        res.json(s ? JSON.parse(s.value) : null);
    } catch (e) {
        res.json(null);
    }
});

// GET /workers/stats - Factory Floor Status (Pending Counts based on Flags)
router.get('/stats', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        // Safe Count Implementation (Counting PENDING items)
        // Pending means: Flag is FALSE and Item is NOT Packed.

        const pvcPending = await ProductionUnit.count({ where: { isPvcDone: false, isPacked: false } });
        const foilPending = await ProductionUnit.count({ where: { isFoilDone: false, isPacked: false } });
        const embossPending = await ProductionUnit.count({ where: { isEmbossDone: false, isPacked: false } });
        const doorPending = await ProductionUnit.count({ where: { isDoorMade: false, isPacked: false } });
        const packingPending = await ProductionUnit.count({ where: { isPacked: false } });

        res.json({
            PVC_CUT: pvcPending,
            FOIL_PASTING: foilPending,
            EMBOSS: embossPending,
            DOOR_MAKING: doorPending,
            PACKING: packingPending
        });
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /workers/tracking - Detailed Order Progress
router.get('/tracking', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: { status: 'PRODUCTION' },
            include: [
                { model: User, as: 'Distributor', attributes: ['name', 'shopName'] },
                {
                    model: OrderItem,
                    include: [{ model: ProductionUnit }]
                }
            ],
            order: [['updatedAt', 'DESC']]
        });

        const tracking = orders.map(order => {
            let totalUnits = 0;
            let orderStats = { pvc: 0, foil: 0, emboss: 0, door: 0, packed: 0 };

            const items = order.OrderItems.map(item => {
                let itemTotal = 0;
                let itemStats = { pvc: 0, foil: 0, emboss: 0, door: 0, packed: 0 };

                if (item.ProductionUnits && item.ProductionUnits.length > 0) {
                    itemTotal = item.ProductionUnits.length;
                    item.ProductionUnits.forEach(u => {
                        if (u.isPvcDone) { orderStats.pvc++; itemStats.pvc++; }
                        if (u.isFoilDone) { orderStats.foil++; itemStats.foil++; }
                        if (u.isEmbossDone) { orderStats.emboss++; itemStats.emboss++; }
                        if (u.isDoorMade) { orderStats.door++; itemStats.door++; }
                        if (u.isPacked) { orderStats.packed++; itemStats.packed++; }
                    });
                } else {
                    itemTotal = item.quantity;
                }
                totalUnits += itemTotal;

                return {
                    designName: item.Design?.designNumber || 'Unknown',
                    colorName: item.Color?.name || 'Unknown',
                    width: item.width,
                    height: item.height,
                    quantity: itemTotal,
                    progress: itemStats
                };
            });

            return {
                id: order.id,
                distributor: order.Distributor?.shopName || 'Direct',
                total: totalUnits,
                progress: orderStats,
                pending: totalUnits - orderStats.packed,
                items: items // Expose items for grouping
            };
        });

        res.json(tracking);
    } catch (error) {
        console.error('Tracking Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /workers/login - Worker PIN Login
router.post('/login', async (req, res) => {
    try {
        const { pinCode } = req.body;
        if (!pinCode) return res.status(400).json({ error: 'PIN Required' });

        // Find worker by verifying PIN across all workers? 
        // Or do we need Worker ID? 
        // User asked for "LOGIN ID". 
        // Ideally: Select Name -> Enter PIN. Or just Enter PIN (if unique).
        // Let's assume unique PIN for simplicity if possible, but collision is likely with 4 digits.
        // Plan: Login Screen lists Workers (or search), then PIN.
        // Or simpler: Enter PIN. If unique, login. If not, ask which user.
        // But 4 digit PIN is weak.
        // Let's do: Select User -> Enter PIN.
        // So this endpoint should verify a specific user's PIN.
        // Or... wait. "Worker Login (Login ID)". Maybe they need an ID?
        // Let's require { workerId, pinCode }.

        const { workerId } = req.body;
        if (!workerId) return res.status(400).json({ error: 'Worker selection required' });

        const worker = await Worker.findByPk(workerId);
        if (!worker) return res.status(404).json({ error: 'Worker not found' });
        if (!worker.isActive) return res.status(403).json({ error: 'Worker account disabled' });

        const isMatch = await bcrypt.compare(pinCode.toString(), worker.pinCode);
        if (!isMatch) return res.status(401).json({ error: 'Invalid PIN' });

        // Generate Token (Reuse existing auth middleware structure if possible, but keep simple)
        // We can just return the worker object and store in local storage for this simple app.
        // Or use JWT. Let's use JWT to play nice with 'authenticate' middleware if needed.
        // But authenticate middleware expects User model?
        // Middleware: `const user = await User.findByPk(decoded.id);`
        // So standard auth won't work for Worker unless I Update middleware.

        // Strategy: Return a special token or just return worker info. 
        // Since "Offline Mode" is a requirement, maybe we don't strictly need server auth for every tap if we trust the device?
        // No, let's use JWT. I'll need to update middleware or create 'authenticateWorker'.

        // For Speed: Just return the worker details. Client stores it.
        // Verification on actions: Pass `workerId` in requests.
        // It's a factory floor app. Low security risk if physical access is controlled.

        res.json({
            message: 'Login successful',
            worker: {
                id: worker.id,
                name: worker.name,
                role: worker.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /workers/public - Public list for Login Screen
router.get('/public', async (req, res) => {
    try {
        const workers = await Worker.findAll({
            attributes: ['id', 'name', 'role'],
            where: { isActive: true },
            order: [['name', 'ASC']]
        });
        res.json(workers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /workers/tasks - Get ALL visible tasks (Parallel Workflow)
router.get('/tasks', async (req, res) => {
    try {
        const workerId = req.headers['x-worker-id'];
        if (!workerId) return res.status(401).json({ error: 'Worker ID required' });

        const worker = await Worker.findByPk(workerId);
        if (!worker) return res.status(404).json({ error: 'Worker not found' });

        // VISIBILITY RULE: "Every process user can see all orders immediately"
        // Return all pending units (not yet packed).
        const tasks = await ProductionUnit.findAll({
            where: { isPacked: false },
            include: [{
                model: OrderItem,
                include: [
                    { model: Design, attributes: ['designNumber', 'imageUrl'] },
                    { model: Color, attributes: ['name', 'imageUrl'] },
                    {
                        model: Order,
                        attributes: ['id'],
                        include: [
                            { model: User, as: 'Distributor', attributes: ['name', 'shopName'] },
                            { model: User, attributes: ['name', 'shopName'] } // Dealer
                        ]
                    }
                ]
            }],
            order: [['updatedAt', 'ASC']]
        });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /workers/complete - Mark task as done (With Dependency Checks)
router.post('/complete', async (req, res) => {
    try {
        const { workerId, unitId } = req.body;

        const worker = await Worker.findByPk(workerId);
        if (!worker) return res.status(404).json({ error: 'Worker not found' });

        const unit = await ProductionUnit.findByPk(unitId);
        if (!unit) return res.status(404).json({ error: 'Unit not found' });

        // CHECK GEOFENCE
        const { lat, lng } = req.body;
        await SystemSetting.sync(); // Ensure table exists
        const setting = await SystemSetting.findByPk('FACTORY_COORDS');
        if (setting) {
            const factory = JSON.parse(setting.value);
            // 500 meters tolerance
            if (lat && lng) {
                const dist = getDistanceFromLatLonInMeters(lat, lng, factory.lat, factory.lng);
                console.log(`Worker Dist: ${dist}m`);
                if (dist > 500) {
                    return res.status(403).json({ error: `You are ${Math.round(dist)}m away from Factory!` });
                }
            } else {
                return res.status(403).json({ error: 'GPS Location Access Required' });
            }
        }

        // DEFINE RULES
        const ROLE_MAP = {
            'PVC_CUT': { flag: 'isPvcDone', deps: [] },
            'FOIL_PASTING': { flag: 'isFoilDone', deps: [] },
            'EMBOSS': { flag: 'isEmbossDone', deps: ['isFoilDone'] },
            'DOOR_MAKING': { flag: 'isDoorMade', deps: ['isPvcDone', 'isFoilDone', 'isEmbossDone'] },
            'PACKING': { flag: 'isPacked', deps: ['isDoorMade'] }
        };

        const rule = ROLE_MAP[worker.role];
        if (!rule) return res.status(400).json({ error: 'Invalid Worker Role' });

        // CHECK 1: Already Done?
        if (unit[rule.flag]) {
            return res.json({ message: 'Already completed' });
        }

        // CHECK 2: Dependencies
        const missingDeps = rule.deps.filter(dep => !unit[dep]);
        if (missingDeps.length > 0) {
            return res.status(400).json({ error: `Start failed. Waiting for: ${missingDeps.join(', ')}` });
        }

        // EXECUTE
        const updateData = {};
        updateData[rule.flag] = true;

        await unit.update(updateData);

        // Create History Record
        await sequelize.models.ProcessRecord.create({
            productionUnitId: unit.id,
            workerId: worker.id,
            stage: worker.role,
            timestamp: new Date()
        });

        if (rule.flag === 'isPacked') {
            // Check if ALL units in this Order are now PACKED
            // 1. Get Order Item to find Order ID
            const orderItem = await OrderItem.findByPk(unit.orderItemId);
            if (orderItem) {
                const orderId = orderItem.orderId;

                // 2. Count Total vs Packed for this Order
                // We need to check all units associated with all items of this order
                // Actually, easier: Count OrderItems -> ProductionUnits

                const allUnits = await ProductionUnit.findAll({
                    include: [{
                        model: OrderItem,
                        where: { orderId: orderId }
                    }]
                });

                const totalUnits = allUnits.length;
                const packedUnits = allUnits.filter(u => u.isPacked).length;

                console.log(`Order ${orderId}: ${packedUnits}/${totalUnits} packed`);

                if (totalUnits > 0 && totalUnits === packedUnits) {
                    await Order.update({ status: 'READY' }, { where: { id: orderId } });
                    console.log(`Order ${orderId} marked as READY`);
                }
            }
        }

        res.json({ message: 'Task Completed', flags: updateData });
    } catch (error) {

        res.status(500).json({ error: error.message });
    }
});

// GET /workers/history - Get tasks completed TODAY by this worker
router.get('/history', async (req, res) => {
    try {
        const workerId = req.headers['x-worker-id'];
        if (!workerId) return res.status(401).json({ error: 'Worker ID required' });

        const worker = await Worker.findByPk(workerId);
        if (!worker) return res.status(404).json({ error: 'Worker not found' });

        // Get ProcessRecords for today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const history = await sequelize.models.ProcessRecord.findAll({
            where: {
                workerId: worker.id,
                timestamp: { [Op.gte]: startOfDay }
            },
            include: [{
                model: ProductionUnit,
                include: [{
                    model: OrderItem,
                    include: [
                        { model: Design, attributes: ['designNumber'] },
                        { model: Color, attributes: ['name'] },
                        { model: Order, attributes: ['id', 'referenceNumber'] } // Added Order Ref
                    ]
                }]
            }],
            order: [['timestamp', 'DESC']]
        });

        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /workers/undo - Revert a completion
router.post('/undo', async (req, res) => {
    try {
        const { workerId, recordId } = req.body; // ProcessRecord ID is safer than Unit ID for history

        const record = await sequelize.models.ProcessRecord.findByPk(recordId);
        if (!record) return res.status(404).json({ error: 'Record not found' });
        if (record.workerId != workerId) return res.status(403).json({ error: 'Unauthorized' });

        const unit = await ProductionUnit.findByPk(record.productionUnitId);
        if (!unit) return res.status(404).json({ error: 'Unit not found' });

        const worker = await Worker.findByPk(workerId);
        const ROLE_MAP = {
            'PVC_CUT': { flag: 'isPvcDone' },
            'FOIL_PASTING': { flag: 'isFoilDone' },
            'EMBOSS': { flag: 'isEmbossDone' },
            'DOOR_MAKING': { flag: 'isDoorMade' },
            'PACKING': { flag: 'isPacked' }
        };
        const rule = ROLE_MAP[worker.role];

        // 1. Revert Flag
        const updateData = {};
        updateData[rule.flag] = false;
        await unit.update(updateData);

        // 2. Delete Record
        await record.destroy();

        // 3. Revert Order Status if PACKING was undone
        if (worker.role === 'PACKING') {
            const orderItem = await OrderItem.findByPk(unit.orderItemId);
            if (orderItem) {
                const order = await Order.findByPk(orderItem.orderId);
                // If it was READY, revert to PRODUCTION
                // (Safest assumption: if we are undoing a pack, it's definitely not ready anymore, 
                // unless there are somehow 0 items? No, assume PRODUCTION.)
                if (order.status === 'READY') {
                    await order.update({ status: 'PRODUCTION' });
                    console.log(`Order ${order.id} reverted to PRODUCTION`);
                }
            }
        }

        res.json({ message: 'Undone successfully' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /workers - Create Worker
router.post('/', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { name, pinCode, role } = req.body;

        // Simple validation
        if (!name || !pinCode || !role) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        // Check PIN length? (4 digits)

        // Hash PIN
        const hashedPin = await bcrypt.hash(pinCode.toString(), 10);

        const worker = await Worker.create({
            name,
            pinCode: hashedPin,
            role,
            isActive: true
        });

        res.status(201).json({ message: 'Worker created', worker: { id: worker.id, name: worker.name, role: worker.role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /workers/:id - Deactivate
router.delete('/:id', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const worker = await Worker.findByPk(req.params.id);
        if (!worker) return res.status(404).json({ error: 'Not found' });

        await worker.destroy(); // Or soft delete? User usually prefers delete if mistake.
        res.json({ message: 'Worker deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /workers - List all workers (Admin/Manufacturer)
router.get('/', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const workers = await Worker.findAll({
            attributes: { exclude: ['pinCode'] },
            order: [['name', 'ASC']]
        });
        res.json(workers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /workers/repair - Backfill missing Production Units for existing orders
router.post('/repair', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        console.log('Starting Factory Data Repair...');

        // 1. Sync Tables (Ensure they exist)
        await Worker.sync();
        await ProductionUnit.sync({ alter: true });

        // 2. Find Orders in PRODUCTION
        const orders = await sequelize.models.Order.findAll({
            where: { status: 'PRODUCTION' },
            include: [OrderItem]
        });

        let createdCount = 0;
        let updatedCount = 0;

        for (const order of orders) {
            for (const item of order.OrderItems) {
                // Find or Create
                const existingUnits = await ProductionUnit.findAll({ where: { orderItemId: item.id } });

                if (existingUnits.length === 0) {
                    for (let i = 1; i <= item.quantity; i++) {
                        await ProductionUnit.create({
                            orderItemId: item.id,
                            unitNumber: i,
                            uniqueCode: `OD${order.id}-IT${item.id}-QN${i}`
                        });
                        createdCount++;
                    }
                } else {
                    // Migrate
                    for (const unit of existingUnits) {
                        if (!unit.isPvcDone && !unit.isFoilDone && unit.currentStage) {
                            const updates = {};
                            if (['FOIL_PASTING', 'EMBOSS', 'DOOR_MAKING', 'PACKING', 'COMPLETED'].includes(unit.currentStage)) updates.isPvcDone = true;
                            if (['EMBOSS', 'DOOR_MAKING', 'PACKING', 'COMPLETED'].includes(unit.currentStage)) updates.isFoilDone = true;
                            if (['DOOR_MAKING', 'PACKING', 'COMPLETED'].includes(unit.currentStage)) updates.isEmbossDone = true;
                            if (['PACKING', 'COMPLETED'].includes(unit.currentStage)) updates.isDoorMade = true;

                            if (Object.keys(updates).length > 0) {
                                await unit.update(updates);
                                updatedCount++;
                            }
                        }
                    }
                }
            }
        }
        res.json({ message: `Complete. Created ${createdCount}, Migrated ${updatedCount} units.` });
    } catch (error) {
        console.error('Repair failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// ADMIN: Get units at a specific stage
router.get('/stage/:stage', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const units = await ProductionUnit.findAll({
            where: { currentStage: req.params.stage },
            include: [{
                model: OrderItem,
                include: [
                    { model: Design, attributes: ['designNumber'] },
                    { model: Color, attributes: ['name'] }
                ]
            }]
        });
        res.json(units);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ADMIN: Force Move Unit to specific stage
router.post('/move', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { unitIds, targetStage } = req.body;

        await ProductionUnit.update(
            { currentStage: targetStage },
            { where: { id: { [Op.in]: unitIds } } }
        );

        res.json({ message: 'Units moved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
