const express = require('express');
const router = express.Router();
const { Order, OrderItem, Design, Color, User, DoorType } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

// Create Order (Dealer)
router.post('/', authenticate, authorize(['DEALER']), async (req, res) => {
    try {
        const { items, remarks } = req.body; // items: [{ designId, colorId, width, height, quantity, remarks }]

        if (!items || items.length === 0) return res.status(400).json({ error: 'No items' });

        // Verify Dealer Link
        if (!req.user.distributorId) return res.status(400).json({ error: 'Dealer not linked to Distributor' });

        const order = await Order.create({
            userId: req.user.id,
            distributorId: req.user.distributorId,
            status: 'RECEIVED'
        });

        // Create Items with Snapshots
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
                // Snapshots
                designNameSnapshot: design ? design.designNumber : 'Unknown',
                colorNameSnapshot: color ? color.name : 'Unknown',
                designImageSnapshot: design ? design.imageUrl : null,
                colorImageSnapshot: color ? color.imageUrl : null
            });
        }

        res.status(201).json(order);
    } catch (error) {
        console.error(error);
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
        if (req.user.role === 'DISTRIBUTOR' && order.distributorId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
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
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ANALYTICS ENDPOINT (Manufacturer Only)
router.get('/analytics', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        // 1. KPIs
        const totalOrders = await Order.count();
        const pendingOrders = await Order.count({
            where: { status: { [Op.notIn]: ['DISPATCHED', 'CANCELLED'] } }
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
            kpi: { totalOrders, pendingOrders, completedOrders },
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

// BULK STATUS UPDATE
router.put('/bulk-status', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { orderIds, status } = req.body;
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'Invalid order IDs' });
        }

        await Order.update({ status }, {
            where: {
                id: { [Op.in]: orderIds }
            }
        });

        res.json({ message: 'Orders updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE SINGLE ORDER (Manufacturer Only)
router.delete('/:id', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { id } = req.params;

        // First delete all order items
        await OrderItem.destroy({ where: { orderId: id } });

        // Then delete the order
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

        // First delete all order items for these orders
        await OrderItem.destroy({
            where: {
                orderId: { [Op.in]: orderIds }
            }
        });

        // Then delete the orders
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

        // Group items by dealerEmail and orderDate to create orders
        const groupedOrders = {};
        for (const row of orderData) {
            const dealerEmail = getValue(row, 'dealerEmail', 'dealer_email', 'email', 'Dealer Email');
            const orderDateStr = getValue(row, 'orderDate', 'order_date', 'date', 'Order Date');
            const status = getValue(row, 'status', 'Status') || 'RECEIVED';

            const key = `${dealerEmail}_${orderDateStr || 'today'}`;
            if (!groupedOrders[key]) {
                groupedOrders[key] = {
                    dealerEmail,
                    orderDate: parseDate(orderDateStr),
                    status: status.toUpperCase(),
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

                // Create Order with explicit createdAt
                const order = await Order.create({
                    userId: dealer.id,
                    distributorId: dealer.distributorId,
                    status: orderGroup.status,
                    createdAt: orderGroup.orderDate,
                    updatedAt: orderGroup.orderDate
                });

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
                        let design = null;
                        if (designNumber) {
                            design = await Design.findOne({ where: { designNumber } });
                            // If not found and it's numeric, try by ID
                            if (!design && /^\d+$/.test(designNumber)) {
                                design = await Design.findByPk(parseInt(designNumber));
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

                        await OrderItem.create({
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

module.exports = router;
