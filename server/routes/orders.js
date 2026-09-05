const express = require('express');
const router = express.Router();
const { Order, OrderItem, Design, Color, User, DoorType, sequelize, ProductionUnit, Notification, SystemSetting } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');
const { getDesignType } = require('../utils/designLogic');
const wa = require('../utils/whatsapp');

// Default production lead time (days) — used to auto-set each order's expected date.
const DEFAULT_LEAD_DAYS = 7;
async function getLeadDays() {
    try {
        await SystemSetting.sync();
        const s = await SystemSetting.findByPk('LEAD_DAYS');
        const n = s ? parseInt(s.value) : NaN;
        return Number.isFinite(n) && n > 0 ? n : DEFAULT_LEAD_DAYS;
    } catch { return DEFAULT_LEAD_DAYS; }
}

// Create Order (Dealer)
router.post('/', authenticate, authorize(['DEALER']), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { items, remarks, siteName } = req.body;

        if (!items || items.length === 0) {
            await t.rollback();
            return res.status(400).json({ error: 'No items' });
        }

        if (!req.user.distributorId) {
            await t.rollback();
            return res.status(400).json({ error: 'Dealer not linked to Distributor' });
        }

        // Auto expected ready date = today + lead days
        const leadDays = await getLeadDays();
        const expected = new Date();
        expected.setDate(expected.getDate() + leadDays);

        const order = await Order.create({
            userId: req.user.id,
            distributorId: req.user.distributorId,
            status: 'RECEIVED',
            expectedDate: expected,
            siteName: siteName ? String(siteName).trim() : null
        }, { transaction: t });

        const { SheetMaster } = require('../models');
        const { getOptimalBlankSize } = require('../utils/designLogic');

        for (const item of items) {
            const design = await Design.findByPk(item.designId);
            const color = await Color.findByPk(item.colorId);

            await OrderItem.create({
                orderId: order.id,
                designId: item.designId,
                colorId: item.colorId,
                width: item.width,
                height: item.height,
                quantity: item.quantity,
                remarks: item.remarks,
                hasLock: item.hasLock || false,
                hasVent: item.hasVent || false,
                designNameSnapshot: design ? design.designNumber : 'Unknown',
                colorNameSnapshot: color ? color.name : 'Unknown',
                designImageSnapshot: design ? design.imageUrl : null,
                colorImageSnapshot: color ? color.imageUrl : null
            }, { transaction: t });

            // Low-stock warning check (no deduction at order time — deduction happens at PRODUCTION)
            try {
                const designRef = design?.designNumber || 'Unknown';
                const designType = design?.category || getDesignType(designRef);
                const materialType = String(designRef).toUpperCase().startsWith('WPC') ? 'WPC' : 'PVC';
                const availableSheets = await SheetMaster.findAll({ where: { isEnabled: true, materialType } });
                const blankSize = getOptimalBlankSize(item.width, item.height, designType, availableSheets);

                if (blankSize && blankSize !== 'No match' && blankSize !== 'Missing Dimensions') {
                    const [w, , h] = blankSize.split(' ');
                    const sheet = await SheetMaster.findOne({
                        where: { width: parseFloat(w), height: parseFloat(h), materialType, isEnabled: true }
                    });
                    if (sheet && sheet.currentStock < item.quantity * 2) {
                        await Notification.create({
                            targetRole: 'MANUFACTURER',
                            title: 'Low Stock Alert',
                            message: `Order #${order.id} requires ${item.quantity * 2} sheets of ${blankSize}, only ${sheet.currentStock} in stock`,
                            type: 'WARNING',
                            orderId: order.id
                        });
                    }
                }
            } catch (stockErr) {
                console.error('Stock check error (non-critical):', stockErr.message);
            }
        }

        await t.commit();

        // Notify manufacturer (outside transaction — non-critical)
        try {
            const dealerName = req.user.shopName || req.user.name;
            await Notification.create({
                targetRole: 'MANUFACTURER',
                title: 'New Order Received',
                message: `New Order from ${dealerName} (${items.length} items)`,
                type: 'INFO',
                orderId: order.id
            });
            // WhatsApp alert to manufacturer
            wa.notifyManufacturerNewOrder(order.id, dealerName, items.length).catch(() => {});
            // WhatsApp confirmation to dealer
            const dealer = await User.findByPk(req.user.id, { attributes: ['name', 'shopName', 'phone'] });
            wa.notifyDealerOrderReceived(dealer, order.id).catch(() => {});
        } catch (nErr) { console.error('Notification failed', nErr); }

        res.status(201).json(order);
    } catch (error) {
        await t.rollback();
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Analytics & KPI Endpoint
router.get('/analytics', authenticate, authorize(['MANUFACTURER', 'DISTRIBUTOR', 'MANAGER']), async (req, res) => {
    try {
        const where = {};
        if (req.user.role === 'DISTRIBUTOR') {
            where.distributorId = req.user.id;
        }

        const totalOrders = await Order.count({ where });
        const pendingOrders = await Order.count({
            where: {
                ...where,
                status: { [Op.or]: ['RECEIVED', 'PRODUCTION', 'READY'] }
            }
        });
        const completedOrders = await Order.count({
            where: {
                ...where,
                status: 'DISPATCHED'
            }
        });

        // Recent 5 Orders
        const recentOrders = await Order.findAll({
            where,
            limit: 5,
            order: [['createdAt', 'DESC']], // Latest first
            include: [{ model: User, attributes: ['name', 'shopName'] }]
        });

        // Chart Data: Orders by Status
        const statusCounts = await Order.findAll({
            where,
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
            group: ['status']
        });

        const chartData = statusCounts.map(row => ({
            name: row.status,
            value: parseInt(row.get('count'))
        }));

        res.json({
            kpi: { totalOrders, pendingOrders, completedOrders },
            recentOrders,
            chartData
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get Orders (Filtered)
router.get('/', authenticate, async (req, res) => {
    try {
        const { status, dealerId, search, sort } = req.query;
        const where = {};

        // Role Restrictions
        if (req.user.role === 'DEALER') {
            where.userId = req.user.id;
        } else if (req.user.role === 'DISTRIBUTOR') {
            where.distributorId = req.user.id; // User ID of distributor is stored in orders.distributorId? No, orders.distributorId matches user.id of dist.
            // Wait, User table has id. Order has distributorId.
            // If I am a distributor, my ID is 2. Orders for me have distributorId=2.
            where.distributorId = req.user.id;
        }
        // Manufacturer sees all

        // Filters
        if (status) where.status = status;
        if (dealerId && req.user.role !== 'DEALER') where.userId = dealerId;
        if (req.query.distributorId && req.user.role === 'MANUFACTURER') {
            where.distributorId = req.query.distributorId;
        }

        // Date Filtering
        if (req.query.startDate && req.query.endDate) {
            where.createdAt = {
                [Op.between]: [
                    new Date(req.query.startDate + 'T00:00:00.000Z'),
                    new Date(req.query.endDate + 'T23:59:59.999Z')
                ]
            };
        }

        // Search (by ID or Dealer Name)
        // Complex Search needs Include
        const include = [
            {
                model: User,
                attributes: ['name', 'username'],
            },
            {
                model: OrderItem,
                include: [
                    { model: Design, attributes: ['designNumber'] }, // Fallback if snapshot missing
                    { model: Color, attributes: ['name'] }
                ]
            }
        ];

        if (search) {
            // Start with logic for Order ID
            if (!isNaN(search)) {
                where.id = search;
            }
            // Note: searching across associated dealer name is harder in simple Sequelize without subqueries, 
            // typically handled on frontend or advanced query. 
            // ensuring simplicity: we filter by ID if number.
        }

        const orders = await Order.findAll({
            where,
            include,
            order: [['createdAt', sort === 'oldest' ? 'ASC' : 'DESC']]
        });

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Update Status
router.put('/:id/status', authenticate, authorize(['MANUFACTURER', 'DISTRIBUTOR', 'DEALER']), async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ error: 'Not found' });

        const newStatus = req.body.status;

        // Authorization Check for Distributor
        if (req.user.role === 'DISTRIBUTOR') {
            if (order.distributorId !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            // Distributor cannot change status to PRODUCTION, READY, or DISPATCHED (Factory Only)
            if (['PRODUCTION', 'READY', 'DISPATCHED'].includes(newStatus)) {
                return res.status(403).json({ error: 'Distributors cannot update production or dispatch status' });
            }
        }

        // Authorization Check for Dealer - Can only cancel their own orders before production
        if (req.user.role === 'DEALER') {
            // Dealer can only modify their own orders
            if (order.userId !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized - not your order' });
            }
            // Dealer can only set status to CANCELLED
            if (newStatus !== 'CANCELLED') {
                return res.status(403).json({ error: 'Dealers can only cancel orders' });
            }
            // Dealer can only cancel if order is in RECEIVED status (before production)
            if (order.status !== 'RECEIVED') {
                return res.status(403).json({ error: 'Cannot cancel - order already in production' });
            }
        }

        await order.update({ status: newStatus });

        // WhatsApp notifications on key status changes
        try {
            if (newStatus === 'READY' || newStatus === 'DISPATCHED') {
                const dealer = await User.findByPk(order.userId, { attributes: ['name', 'shopName', 'phone'] });
                const distributor = order.distributorId
                    ? await User.findByPk(order.distributorId, { attributes: ['name', 'shopName', 'phone'] })
                    : null;

                if (newStatus === 'READY') {
                    wa.notifyDealerOrderReady(dealer, order.id).catch(() => {});
                    if (distributor) wa.notifyDistributorOrderReady(distributor, order.id).catch(() => {});
                } else if (newStatus === 'DISPATCHED') {
                    wa.notifyDealerOrderDispatched(dealer, order.id).catch(() => {});
                }
            }
        } catch (waErr) { console.error('WhatsApp status notify error:', waErr.message); }

        // FACTORY SYSTEM: Generate Production Units if moving to PRODUCTION
        if (newStatus === 'PRODUCTION') {
            const items = await OrderItem.findAll({
                where: { orderId: order.id },
                include: [
                    { model: Design, attributes: ['designNumber', 'category'] }
                ]
            });

            // STOCK DEDUCTION LOGIC
            const { SheetMaster, StockHistory } = require('../models');
            const { getOptimalBlankSize, getDesignType } = require('../utils/designLogic');

            for (const item of items) {
                // 1. Create Units — only on first move to PRODUCTION
                const existing = await ProductionUnit.count({ where: { orderItemId: item.id } });
                const isFirstTime = existing === 0;

                if (isFirstTime) {
                    const designRef = item.Design?.designNumber || item.designNameSnapshot || '';
                    const isWPC = String(designRef).toUpperCase().startsWith('WPC');
                    for (let i = 1; i <= item.quantity; i++) {
                        await ProductionUnit.create({
                            orderItemId: item.id,
                            unitNumber: i,
                            uniqueCode: `OD${order.id}-IT${item.id}-QN${i}`,
                            currentStage: 'PVC_CUT',
                            // WPC doors skip PVC cutting — pre-mark so DOOR_MAKING isn't blocked
                            isPvcDone: isWPC ? true : false
                        });
                    }
                }

                // 2. Deduct Stock — only on first move to PRODUCTION to prevent double deduction
                if (!isFirstTime) {
                    console.log(`⏭️ Skipping stock deduction for item ${item.id} — ProductionUnits already exist`);
                    continue;
                }
                try {
                    const designRef = item.Design?.designNumber || item.designNameSnapshot || 'Unknown';
                    const designType = item.Design?.category || getDesignType(designRef);
                    const materialType = String(designRef).toUpperCase().startsWith('WPC') ? 'WPC' : 'PVC';

                    // Get available sheets
                    const availableSheets = await SheetMaster.findAll({ where: { isEnabled: true, materialType } });
                    const blankSize = getOptimalBlankSize(item.width, item.height, designType, availableSheets);

                    if (blankSize && blankSize !== 'No match' && blankSize !== 'Missing Dimensions') {
                        const [width, , height] = blankSize.split(' ');
                        const sheet = await SheetMaster.findOne({
                            where: { width: parseFloat(width), height: parseFloat(height), materialType, isEnabled: true }
                        });

                        if (sheet) {
                            const sheetsNeeded = item.quantity * 2;
                            // Use atomic decrement to prevent race condition when multiple
                            // orders are moved to PRODUCTION simultaneously
                            await sheet.decrement('currentStock', { by: sheetsNeeded });

                            await StockHistory.create({
                                sheetId: sheet.id,
                                change: -sheetsNeeded,
                                type: 'CONSUMPTION',
                                relatedOrderId: order.id,
                                description: `Production Started: Order #${order.id}`
                            });
                            console.log(`📉 Stock Deducted: ${sheetsNeeded} x ${blankSize} for Order #${order.id}`);
                        }
                    }
                } catch (err) {
                    console.error('Stock deduction error in status update:', err.message);
                }
            }
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- LEAD TIME SETTING (admin) ---
router.get('/settings/lead-time', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const days = await getLeadDays();
        res.json({ leadDays: days });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/settings/lead-time', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const days = parseInt(req.body.leadDays);
        if (!Number.isFinite(days) || days < 0 || days > 365) {
            return res.status(400).json({ error: 'Lead days must be a number between 0 and 365' });
        }
        await SystemSetting.sync();
        await SystemSetting.upsert({ key: 'LEAD_DAYS', value: String(days) });
        res.json({ leadDays: days });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- DISPATCH an order with delivery-challan details (logistics, no money) ---
router.put('/:id/dispatch', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const { vehicleNo, transportName, lrNumber } = req.body;
        await order.update({
            status: 'DISPATCHED',
            vehicleNo: vehicleNo || null,
            transportName: transportName || null,
            lrNumber: lrNumber || null,
            dispatchedAt: new Date()
        });

        // WhatsApp dispatch notification (best-effort)
        try {
            const dealer = await User.findByPk(order.userId, { attributes: ['name', 'shopName', 'phone'] });
            wa.notifyDealerOrderDispatched(dealer, order.id).catch(() => {});
        } catch (e) { console.error('dispatch notify error:', e.message); }

        res.json(order);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- UPDATE EXPECTED DATE for one order (admin manual override) ---
router.put('/:id/expected-date', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        const { expectedDate } = req.body; // YYYY-MM-DD or null
        await order.update({ expectedDate: expectedDate ? new Date(expectedDate) : null });
        res.json(order);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ANALYTICS ENDPOINT (Manufacturer Only)
router.get('/analytics/manufacturer-details', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

        // 1. KPIs
        const totalOrders = await Order.count();

        // Trend Calculation (Orders this week vs last week)
        const ordersThisWeek = await Order.count({
            where: { createdAt: { [Op.gte]: lastWeek } }
        });
        const ordersLastWeek = await Order.count({
            where: { createdAt: { [Op.between]: [twoWeeksAgo, lastWeek] } }
        });
        const trendPercent = ordersLastWeek === 0 ? 100 : Math.round(((ordersThisWeek - ordersLastWeek) / ordersLastWeek) * 100);

        // Pending & Overdue
        const pendingOrders = await Order.count({
            where: { status: { [Op.notIn]: ['DISPATCHED', 'CANCELLED'] } }
        });

        const overdueDate = new Date();
        overdueDate.setDate(overdueDate.getDate() - 7); // 7 Days SLA
        const overdueOrders = await Order.count({
            where: {
                status: { [Op.notIn]: ['DISPATCHED', 'CANCELLED'] },
                createdAt: { [Op.lt]: overdueDate }
            }
        });

        const completedOrders = await Order.count({
            where: { status: 'DISPATCHED' }
        });

        // 2. Orders per Distributor (Chart Data)
        // Group by distributorId
        const distData = await Order.findAll({
            attributes: [
                'distributorId',
                [sequelize.fn('COUNT', sequelize.col('Order.id')), 'count']
            ],
            include: [{ model: User, as: 'Distributor', attributes: ['name', 'shopName'] }], // Ensure association exists or handle manually
            group: ['distributorId', 'Distributor.id'],
            order: [[sequelize.literal('count'), 'DESC']],
            limit: 5
        });

        // 3. Recent Activity
        const recentOrders = await Order.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{ model: User, attributes: ['name'] }]
        });

        res.json({
            kpi: {
                totalOrders,
                pendingOrders,
                overdueOrders,
                completedOrders,
                trend: trendPercent
            },
            chartData: distData.map(d => ({
                name: d.Distributor?.name || 'Unknown',
                count: parseInt(d.getDataValue('count'))
            })),
            recentOrders
        });
    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// MATERIAL USAGE ANALYSIS (New Feature)
router.get('/analytics/materials', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        // Fetch all pending items (Received or Production)
        const items = await OrderItem.findAll({
            include: [
                {
                    model: Order,
                    where: { status: { [Op.in]: ['RECEIVED', 'PRODUCTION'] } },
                    attributes: [] // Only filter
                },
                {
                    model: Design,
                    include: [DoorType]
                }
            ]
        });

        // Fetch Dynamic Sheet Sizes
        const { SheetMaster } = require('../models');
        const { getOptimalBlankSize, getDesignType } = require('../utils/designLogic');

        const sheetMasters = await SheetMaster.findAll({ where: { isEnabled: true } });

        const breakdown = {
            'PVC': {},
            'WPC': {}
        };

        for (const item of items) {
            const designRef = item.Design?.designNumber || item.designNameSnapshot;
            const designType = item.Design?.category || getDesignType(designRef);

            // Determine material type from design name
            const materialType = String(designRef || '').toUpperCase().startsWith('WPC') ? 'WPC' : 'PVC';

            // Filter sheets by material type
            const materialSheets = sheetMasters.filter(s => (s.materialType || 'PVC') === materialType);

            // Calculate Blank Size with filtered sheets
            const blankSize = getOptimalBlankSize(item.width, item.height, designType, materialSheets);

            if (blankSize !== 'No match' && blankSize !== 'Missing Dimensions') {
                // Group by material type (PVC or WPC)
                if (!breakdown[materialType][blankSize]) {
                    breakdown[materialType][blankSize] = 0;
                }
                // Each item (Door) uses 2 sheets (Front + Back)
                breakdown[materialType][blankSize] += (item.quantity * 2);
            }
        }

        // Format for Frontend
        // [{ material: 'PVC', sizes: [{ size: '30x78', count: 10 }, ...] }, { material: 'WPC', sizes: [...] }]
        const result = Object.entries(breakdown)
            .filter(([material, sizesObj]) => Object.keys(sizesObj).length > 0) // Only include materials with data
            .map(([material, sizesObj]) => ({
                material,
                sizes: Object.entries(sizesObj)
                    .map(([size, count]) => ({ size, count }))
                    .sort((a, b) => b.count - a.count)
            }));

        res.json({
            breakdown: result,
            pendingItemCount: items.length
        });

    } catch (error) {
        console.error('Material Analytics Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// BULK STATUS UPDATE
router.put('/bulk-status', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { orderIds, status } = req.body;
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'Invalid order IDs' });
        }

        await Order.update({ status }, { where: { id: { [Op.in]: orderIds } } });

        // When moving to PRODUCTION, create ProductionUnits so workers see the tasks
        if (status === 'PRODUCTION') {
            const { SheetMaster, StockHistory } = require('../models');
            const { getOptimalBlankSize } = require('../utils/designLogic');

            const orders = await Order.findAll({
                where: { id: { [Op.in]: orderIds } },
                include: [{ model: OrderItem, include: [{ model: Design, attributes: ['designNumber', 'category'] }] }]
            });

            for (const order of orders) {
                for (const item of order.OrderItems) {
                    const existing = await ProductionUnit.count({ where: { orderItemId: item.id } });
                    if (existing === 0) {
                        for (let i = 1; i <= item.quantity; i++) {
                            await ProductionUnit.create({
                                orderItemId: item.id,
                                unitNumber: i,
                                uniqueCode: `OD${order.id}-IT${item.id}-QN${i}`,
                                currentStage: 'PVC_CUT'
                            });
                        }
                    }

                    // Deduct stock
                    try {
                        const designRef = item.Design?.designNumber || item.designNameSnapshot || 'Unknown';
                        const designType = item.Design?.category || getDesignType(designRef);
                        const materialType = String(designRef).toUpperCase().startsWith('WPC') ? 'WPC' : 'PVC';
                        const availableSheets = await SheetMaster.findAll({ where: { isEnabled: true, materialType } });
                        const blankSize = getOptimalBlankSize(item.width, item.height, designType, availableSheets);

                        if (blankSize && blankSize !== 'No match' && blankSize !== 'Missing Dimensions') {
                            const [w, , h] = blankSize.split(' ');
                            const sheet = await SheetMaster.findOne({
                                where: { width: parseFloat(w), height: parseFloat(h), materialType, isEnabled: true }
                            });
                            if (sheet) {
                                const sheetsNeeded = item.quantity * 2;
                                await sheet.decrement('currentStock', { by: sheetsNeeded });
                                await StockHistory.create({
                                    sheetId: sheet.id,
                                    change: -sheetsNeeded,
                                    type: 'CONSUMPTION',
                                    relatedOrderId: order.id,
                                    description: `Production Started (Bulk): Order #${order.id}`
                                });
                            }
                        }
                    } catch (err) {
                        console.error('Bulk stock deduction error:', err.message);
                    }
                }
            }
        }

        res.json({ message: 'Orders updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE SINGLE ORDER (Manufacturer Only)
router.delete('/:id', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Find Items
        const items = await OrderItem.findAll({ where: { orderId: id } });
        const itemIds = items.map(i => i.id);

        // 2. Delete Production Units (Factory Data)
        if (itemIds.length > 0) {
            await ProductionUnit.destroy({ where: { orderItemId: { [Op.in]: itemIds } } });
        }

        // 3. Delete Items
        await OrderItem.destroy({ where: { orderId: id } });

        // 4. Delete Order
        const deleted = await Order.destroy({ where: { id } });

        if (deleted === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ error: error.message });
    }
});

// BULK DELETE ORDERS (Manufacturer Only)
router.post('/bulk-delete', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { orderIds } = req.body;
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'Invalid order IDs' });
        }

        // 1. Find Items to get IDs for Unit Deletion
        const items = await OrderItem.findAll({ where: { orderId: { [Op.in]: orderIds } } });
        const itemIds = items.map(i => i.id);

        // 2. Delete Production Units
        if (itemIds.length > 0) {
            await ProductionUnit.destroy({ where: { orderItemId: { [Op.in]: itemIds } } });
        }

        // 3. Delete Items
        await OrderItem.destroy({
            where: {
                orderId: { [Op.in]: orderIds }
            }
        });

        // 4. Delete Orders
        const deleted = await Order.destroy({
            where: {
                id: { [Op.in]: orderIds }
            }
        });

        res.json({ message: `${deleted} order(s) deleted successfully`, deleted });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// BULK ORDER IMPORT FROM EXCEL (Manufacturer Only)
router.post('/import', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { orders: orderData } = req.body;
        if (!orderData || !Array.isArray(orderData) || orderData.length === 0) {
            return res.status(400).json({ error: 'No order data provided' });
        }

        let created = 0;
        let failed = 0;
        const errors = [];

        // Helper function to parse date from various formats
        const parseDate = (dateStr) => {
            if (!dateStr) return new Date();

            // Handle DD-MM-YYYY or DD/MM/YYYY format (Indian format)
            const ddmmyyyy = String(dateStr).match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
            if (ddmmyyyy) {
                const [, day, month, year] = ddmmyyyy;
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }

            // Handle YYYY-MM-DD format
            const yyyymmdd = String(dateStr).match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
            if (yyyymmdd) {
                const [, year, month, day] = yyyymmdd;
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }

            // Handle Excel serial date number
            if (typeof dateStr === 'number') {
                return new Date((dateStr - 25569) * 86400 * 1000);
            }

            // Fallback to default parsing
            const parsed = new Date(dateStr);
            return isNaN(parsed.getTime()) ? new Date() : parsed;
        };

        // Helper to get value from row with flexible column names
        const getValue = (row, ...keys) => {
            for (const key of keys) {
                if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                    return row[key];
                }
                // Also try lowercase and with spaces
                const lowerKey = key.toLowerCase();
                for (const rowKey of Object.keys(row)) {
                    if (rowKey.toLowerCase().replace(/\s+/g, '') === lowerKey.replace(/\s+/g, '')) {
                        if (row[rowKey] !== undefined && row[rowKey] !== null && row[rowKey] !== '') {
                            return row[rowKey];
                        }
                    }
                }
            }
            return null;
        };

        // Group items by dealerEmail, orderDate AND orderId to create orders
        const groupedOrders = {};
        for (const row of orderData) {
            const dealerEmail = getValue(row, 'dealerEmail', 'dealer_email', 'email', 'Dealer Email');
            const orderDateStr = getValue(row, 'orderDate', 'order_date', 'date', 'Order Date');
            const status = getValue(row, 'status', 'Status') || 'RECEIVED';
            // NEW: Support for Custom Order ID
            let customOrderId = getValue(row, 'orderId', 'order_id', 'id', 'Order ID', 'ID');

            // Clean customOrderId
            if (customOrderId !== null && typeof customOrderId === 'number') {
                customOrderId = parseInt(customOrderId);
            } else if (customOrderId !== null) {
                customOrderId = parseInt(String(customOrderId).trim());
            }

            // Key must now include customOrderId to split orders correctly
            const key = `${dealerEmail}_${orderDateStr || 'today'}_${customOrderId || 'auto'}`;

            if (!groupedOrders[key]) {
                groupedOrders[key] = {
                    dealerEmail,
                    orderDate: parseDate(orderDateStr),
                    status: status.toUpperCase(),
                    customId: customOrderId, // Store for creation
                    items: []
                };
            }
            groupedOrders[key].items.push(row);
        }

        for (const [key, orderGroup] of Object.entries(groupedOrders)) {
            try {
                // Find Dealer by email
                const dealer = await User.findOne({ where: { email: orderGroup.dealerEmail, role: 'DEALER' } });
                if (!dealer) {
                    errors.push({ row: key, error: `Dealer not found: ${orderGroup.dealerEmail}` });
                    failed += orderGroup.items.length;
                    continue;
                }

                // Check if Custom ID already exists
                if (orderGroup.customId) {
                    const existing = await Order.findByPk(orderGroup.customId);
                    if (existing) {
                        errors.push({ row: key, error: `Order ID ${orderGroup.customId} already exists. Skipping.` });
                        failed += orderGroup.items.length;
                        continue;
                    }
                }

                // Create Order with explicit createdAt
                const orderPayload = {
                    userId: dealer.id,
                    distributorId: dealer.distributorId,
                    status: orderGroup.status,
                    createdAt: orderGroup.orderDate,
                    updatedAt: orderGroup.orderDate
                };

                // FORCE ID if provided
                if (orderGroup.customId) {
                    orderPayload.id = orderGroup.customId;
                }

                const order = await Order.create(orderPayload);

                // Create OrderItems
                for (const item of orderGroup.items) {
                    try {
                        let designNumber = getValue(item, 'designNumber', 'design_number', 'design', 'Design Number', 'Design');
                        let colorName = getValue(item, 'colorName', 'color_name', 'color', 'foilColor', 'foil_color', 'Color Name', 'Foil Color');
                        const width = parseFloat(getValue(item, 'width', 'Width')) || 0;
                        const height = parseFloat(getValue(item, 'height', 'Height')) || 0;
                        const quantity = parseInt(getValue(item, 'quantity', 'qty', 'Quantity')) || 1;
                        const remarks = getValue(item, 'remarks', 'Remarks', 'notes', 'Notes') || '';

                        // Clean up numeric values that Excel might have converted (2.00 -> "2")
                        if (designNumber !== null && typeof designNumber === 'number') {
                            designNumber = Number.isInteger(designNumber) ? String(designNumber) : String(Math.round(designNumber));
                        } else if (designNumber !== null) {
                            designNumber = String(designNumber).trim();
                            // Handle "2.00" -> "2"
                            if (/^\d+\.0+$/.test(designNumber)) {
                                designNumber = String(parseInt(designNumber));
                            }
                        }

                        if (colorName !== null && typeof colorName === 'number') {
                            colorName = Number.isInteger(colorName) ? String(colorName) : String(Math.round(colorName));
                        } else if (colorName !== null) {
                            colorName = String(colorName).trim();
                            // Handle "2.00" -> "2"
                            if (/^\d+\.0+$/.test(colorName)) {
                                colorName = String(parseInt(colorName));
                            }
                        }

                        // Find design - try by designNumber first
                        // Find design - or CREATE if missing (Auto-Learn)
                        let design = null;
                        if (designNumber) {
                            design = await Design.findOne({ where: { designNumber } });

                            if (!design) {
                                // AUTO-CREATE Logic using New Category Rules
                                const detectedType = getDesignType(designNumber);
                                try {
                                    design = await Design.create({
                                        designNumber,
                                        category: detectedType, // 'EMBOSS', 'CNC', etc.
                                        doorTypeId: 1, // Defaulting to 1 (General) for now, can be refined
                                        isTrending: false,
                                        isEnabled: true
                                    });
                                    console.log(`[AUTO-LEARN] Created Design ${designNumber} as ${detectedType}`);
                                } catch (e) {
                                    console.warn(`Failed to auto-create design ${designNumber}`);
                                }
                            }
                        }

                        // Find color - try by name first
                        let color = null;
                        if (colorName) {
                            color = await Color.findOne({ where: { name: colorName } });
                            // If not found and it's numeric, try by ID
                            if (!color && /^\d+$/.test(colorName)) {
                                color = await Color.findByPk(parseInt(colorName));
                            }
                        }


                        // Let's optimize: capture the returned instance
                        const newItem = await OrderItem.create({
                            orderId: order.id,
                            designId: design?.id || null,
                            colorId: color?.id || null,
                            width,
                            height,
                            quantity,
                            remarks,
                            designNameSnapshot: designNumber ? String(designNumber).trim() : (design?.designNumber || 'Unknown'),
                            colorNameSnapshot: colorName ? String(colorName).trim() : (color?.name || 'Unknown'),
                            designImageSnapshot: design?.imageUrl || null,
                            colorImageSnapshot: color?.imageUrl || null
                        });

                        if (order.status === 'PRODUCTION') {
                            for (let i = 1; i <= quantity; i++) {
                                await ProductionUnit.create({
                                    orderItemId: newItem.id,
                                    unitNumber: i,
                                    uniqueCode: `OD${order.id}-IT${newItem.id}-QN${i}`,
                                    currentStage: 'PVC_CUT'
                                });
                            }
                        }
                        created++;
                    } catch (itemErr) {
                        console.error('Item creation error:', itemErr.message);
                        errors.push({ row: item, error: itemErr.message });
                        failed++;
                    }
                }
            } catch (orderErr) {
                console.error('Order creation error:', orderErr.message);
                errors.push({ row: key, error: orderErr.message });
                failed += orderGroup.items.length;
            }
        }

        res.json({ created, failed, errors });
    } catch (error) {
        console.error('Import Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// REPAIR ENDPOINT: Create missing ProductionUnits for PRODUCTION orders
// GET /api/orders/repair-production-units
router.get('/repair-production-units', authenticate, async (req, res) => {
    try {
        console.log('[REPAIR] Starting ProductionUnits repair...');

        // Find all orders in PRODUCTION status
        const productionOrders = await Order.findAll({
            where: { status: 'PRODUCTION' },
            include: [{ model: OrderItem }]
        });

        console.log(`[REPAIR] Found ${productionOrders.length} orders in PRODUCTION status`);

        let ordersProcessed = 0;
        let unitsCreated = 0;
        let ordersSkipped = 0;

        for (const order of productionOrders) {
            if (!order.OrderItems || order.OrderItems.length === 0) {
                console.log(`[REPAIR] Order ${order.id} has no items, skipping...`);
                ordersSkipped++;
                continue;
            }

            let orderNeedsUnits = false;

            for (const item of order.OrderItems) {
                // Check if ProductionUnits already exist
                const existingUnits = await ProductionUnit.count({
                    where: { orderItemId: item.id }
                });

                if (existingUnits === 0) {
                    orderNeedsUnits = true;
                    // Create units for this item
                    for (let i = 1; i <= item.quantity; i++) {
                        await ProductionUnit.create({
                            orderItemId: item.id,
                            unitNumber: i,
                            uniqueCode: `OD${order.id}-IT${item.id}-QN${i}`,
                            currentStage: 'PVC_CUT',
                            isPvcDone: false,
                            isFoilDone: false,
                            isEmbossDone: false,
                            isDoorMade: false,
                            isPacked: false
                        });
                        unitsCreated++;
                    }
                    console.log(`[REPAIR] Created ${item.quantity} units for Order ${order.id}, Item ${item.id}`);
                } else if (existingUnits < item.quantity) {
                    console.log(`[REPAIR] Order ${order.id}, Item ${item.id} has ${existingUnits}/${item.quantity} units - creating missing ones...`);
                    orderNeedsUnits = true;
                    // Create missing units
                    for (let i = existingUnits + 1; i <= item.quantity; i++) {
                        await ProductionUnit.create({
                            orderItemId: item.id,
                            unitNumber: i,
                            uniqueCode: `OD${order.id}-IT${item.id}-QN${i}`,
                            currentStage: 'PVC_CUT'
                        });
                        unitsCreated++;
                    }
                }
            }

            if (orderNeedsUnits) {
                ordersProcessed++;
            } else {
                ordersSkipped++;
            }
        }

        console.log('[REPAIR] Repair complete!');
        console.log(`[REPAIR] Orders processed: ${ordersProcessed}`);
        console.log(`[REPAIR] Production units created: ${unitsCreated}`);
        console.log(`[REPAIR] Orders skipped (already had units): ${ordersSkipped}`);

        res.json({
            success: true,
            message: 'Repair complete! Workers should now see all orders.',
            stats: {
                ordersProcessed,
                unitsCreated,
                ordersSkipped,
                totalProductionOrders: productionOrders.length
            }
        });
    } catch (error) {
        console.error('[REPAIR] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
