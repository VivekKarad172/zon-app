const express = require('express');
const router = express.Router();
const { SheetMaster, StockHistory, Order, OrderItem, Design } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');
const { getOptimalBlankSize, getDesignType } = require('../utils/designLogic');

// GET /sheets - List all sheets with stock levels
router.get('/', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const sheets = await SheetMaster.findAll({
            where: { isEnabled: true },
            order: [['materialType', 'ASC'], ['width', 'ASC'], ['height', 'ASC']]
        });

        // 1. Get all active orders (RECEIVED/PENDING only) for "Blocked" calculation
        // Orders in 'PRODUCTION' are considered "Consumed" (deducted from Stock), so not "Blocked".
        const activeOrders = await Order.findAll({
            where: {
                status: {
                    [Op.in]: ['RECEIVED', 'PENDING'] // Exclude PRODUCTION
                }
            },
            include: [{
                model: OrderItem,
                include: [{ model: Design }]
            }]
        });

        // 2. Create a map for fast lookup
        const metricsMap = {};
        sheets.forEach(s => {
            const key = `${s.width}-${s.height}-${s.materialType}`;
            metricsMap[key] = { ordersReceived: 0, blockedSheets: 0 };
        });

        // 3. Calculate metrics
        for (const order of activeOrders) {
            for (const item of order.OrderItems) {
                const designRef = item.Design?.designNumber || item.designNameSnapshot || 'Unknown';
                const designType = item.Design?.category || getDesignType(designRef);
                const materialType = String(designRef).toUpperCase().startsWith('WPC') ? 'WPC' : 'PVC';

                const availableSheets = sheets.filter(s => s.materialType === materialType);
                const blankSize = getOptimalBlankSize(item.width, item.height, designType, availableSheets);

                if (blankSize && blankSize !== 'No match' && blankSize !== 'Missing Dimensions') {
                    const [width, , height] = blankSize.split(' ');
                    const key = `${parseFloat(width)}-${parseFloat(height)}-${materialType}`;
                    if (metricsMap[key]) {
                        // User Request: 'ORDERS RECEIVED' column should show SHEETS (Total Material), not Order Count
                        metricsMap[key].ordersReceived += item.quantity * 2;
                        metricsMap[key].blockedSheets += item.quantity * 2;
                    }
                }
            }
        }

        // 4. Combine data
        const sheetsWithMetrics = sheets.map(sheet => {
            const key = `${sheet.width}-${sheet.height}-${sheet.materialType}`;
            const metrics = metricsMap[key] || { ordersReceived: 0, blockedSheets: 0 };

            // Available = Physical (Current) - Blocked (Reserved)
            const availableStock = sheet.currentStock - metrics.blockedSheets;

            return {
                ...sheet.toJSON(),
                stockStatus: sheet.currentStock <= sheet.minStock ? 'LOW' : 'GOOD',
                isLow: sheet.currentStock <= sheet.minStock,
                ordersReceived: metrics.ordersReceived,
                blockedSheets: metrics.blockedSheets,
                availableStock: availableStock
            };
        });

        res.json(sheetsWithMetrics);
    } catch (error) {
        console.error('Get sheets error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /sheets/stock - Add stock (Purchase)
router.post('/stock', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { sheetId, quantity, description } = req.body;

        if (!sheetId || !quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Invalid sheet ID or quantity' });
        }

        const sheet = await SheetMaster.findByPk(sheetId);
        if (!sheet) {
            return res.status(404).json({ error: 'Sheet not found' });
        }

        // Update stock
        await sheet.update({
            currentStock: sheet.currentStock + quantity
        });

        // Create history record
        await StockHistory.create({
            sheetId: sheet.id,
            change: quantity,
            type: 'PURCHASE',
            description: description || `Added ${quantity} sheets`
        });

        res.json({
            message: 'Stock added successfully',
            sheet: {
                id: sheet.id,
                size: `${sheet.width} x ${sheet.height}`,
                materialType: sheet.materialType,
                currentStock: sheet.currentStock
            }
        });
    } catch (error) {
        console.error('Add stock error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /sheets/adjust - Manual stock adjustment
router.post('/adjust', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { sheetId, newStock, reason } = req.body;

        if (!sheetId || newStock === undefined || newStock < 0) {
            return res.status(400).json({ error: 'Invalid parameters' });
        }

        const sheet = await SheetMaster.findByPk(sheetId);
        if (!sheet) {
            return res.status(404).json({ error: 'Sheet not found' });
        }

        const change = newStock - sheet.currentStock;

        // Update stock
        await sheet.update({ currentStock: newStock });

        // Create history record
        await StockHistory.create({
            sheetId: sheet.id,
            change: change,
            type: 'ADJUSTMENT',
            description: reason || `Stock adjusted from ${sheet.currentStock} to ${newStock}`
        });

        res.json({
            message: 'Stock adjusted successfully',
            sheet: {
                id: sheet.id,
                size: `${sheet.width} x ${sheet.height}`,
                currentStock: newStock
            }
        });
    } catch (error) {
        console.error('Adjust stock error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /sheets/:id/history - Get stock history for a specific sheet
router.get('/:id/history', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50 } = req.query;

        const history = await StockHistory.findAll({
            where: { sheetId: id },
            include: [{
                model: SheetMaster,
                attributes: ['width', 'height', 'materialType']
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit)
        });

        res.json(history);
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /sheets/history/all - Get all stock history (recent transactions)
router.get('/history/all', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { limit = 100 } = req.query;

        const history = await StockHistory.findAll({
            include: [{
                model: SheetMaster,
                attributes: ['width', 'height', 'materialType']
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit)
        });

        res.json(history);
    } catch (error) {
        console.error('Get all history error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
