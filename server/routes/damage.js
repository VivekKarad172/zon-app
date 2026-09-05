const express = require('express');
const router = express.Router();
const { DamageReport, Order, OrderItem, ProductionUnit, Design, Color, sequelize } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

// GET /api/damage — list damage/return reports (newest first)
router.get('/', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const where = {};
        if (req.query.status) where.status = req.query.status;
        if (req.query.type) where.type = req.query.type;
        const reports = await DamageReport.findAll({ where, order: [['createdAt', 'DESC']] });
        res.json(reports);
    } catch (e) {
        console.error('damage list error:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/damage/summary — counts for dashboard
router.get('/summary', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const all = await DamageReport.findAll({ attributes: ['type', 'status', 'quantity'] });
        const sum = { total: 0, logged: 0, replaced: 0, writtenOff: 0, productionReject: 0, deliveryReturn: 0 };
        for (const r of all) {
            const q = r.quantity || 1;
            sum.total += q;
            if (r.status === 'LOGGED') sum.logged += q;
            else if (r.status === 'REPLACED') sum.replaced += q;
            else if (r.status === 'WRITTEN_OFF') sum.writtenOff += q;
            if (r.type === 'PRODUCTION_REJECT') sum.productionReject += q;
            else if (r.type === 'DELIVERY_RETURN') sum.deliveryReturn += q;
        }
        res.json(sum);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/damage — log a damage / return
router.post('/', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const { orderId, orderItemId, stage, type, reason, quantity } = req.body;

        let designName = req.body.designName || null;
        let colorName = req.body.colorName || null;

        // Auto-fill design/color from the order item if provided
        if (orderItemId) {
            const item = await OrderItem.findByPk(orderItemId);
            if (item) {
                designName = designName || item.designNameSnapshot;
                colorName = colorName || item.colorNameSnapshot;
            }
        }

        const report = await DamageReport.create({
            orderId: orderId || null,
            orderItemId: orderItemId || null,
            designName,
            colorName,
            stage: stage || 'OTHER',
            type: type || 'PRODUCTION_REJECT',
            reason: reason || null,
            quantity: parseInt(quantity) || 1,
            reportedBy: req.user?.name || 'Admin',
            status: 'LOGGED'
        });

        res.status(201).json(report);
    } catch (e) {
        console.error('damage create error:', e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/damage/:id/replace — push replacement doors back into production
router.post('/:id/replace', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const report = await DamageReport.findByPk(req.params.id);
        if (!report) { await t.rollback(); return res.status(404).json({ error: 'Report not found' }); }
        if (report.status === 'REPLACED') { await t.rollback(); return res.status(400).json({ error: 'Already replaced' }); }
        if (!report.orderItemId || !report.orderId) {
            await t.rollback();
            return res.status(400).json({ error: 'This report is not linked to a specific order item, so replacements cannot be auto-created. Handle manually.' });
        }

        const item = await OrderItem.findByPk(report.orderItemId, { include: [Design] });
        if (!item) { await t.rollback(); return res.status(404).json({ error: 'Order item not found' }); }

        const qty = report.quantity || 1;
        const designRef = item.Design?.designNumber || item.designNameSnapshot || '';
        const isWPC = String(designRef).toUpperCase().startsWith('WPC');

        // Find current max unit number for clean codes
        const existing = await ProductionUnit.count({ where: { orderItemId: item.id } });
        for (let i = 1; i <= qty; i++) {
            await ProductionUnit.create({
                orderItemId: item.id,
                unitNumber: existing + i,
                uniqueCode: `OD${report.orderId}-IT${item.id}-RPL${Date.now()}-${i}`,
                currentStage: 'PVC_CUT',
                isPvcDone: isWPC ? true : false   // WPC skips PVC cutting
            }, { transaction: t });
        }

        // Re-open the order so the replacements flow through the floor again
        const order = await Order.findByPk(report.orderId);
        if (order && ['READY', 'DISPATCHED'].includes(order.status)) {
            await order.update({ status: 'PRODUCTION' }, { transaction: t });
        }

        await report.update({ status: 'REPLACED' }, { transaction: t });
        await t.commit();
        res.json({ message: `${qty} replacement door(s) pushed into production`, report });
    } catch (e) {
        await t.rollback();
        console.error('damage replace error:', e);
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/damage/:id — update status (e.g. write-off)
router.put('/:id', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const report = await DamageReport.findByPk(req.params.id);
        if (!report) return res.status(404).json({ error: 'Report not found' });
        const { status, reason } = req.body;
        const update = {};
        if (status) update.status = status;
        if (reason !== undefined) update.reason = reason;
        await report.update(update);
        res.json(report);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/damage/:id
router.delete('/:id', authenticate, authorize(['MANUFACTURER', 'MANAGER']), async (req, res) => {
    try {
        const report = await DamageReport.findByPk(req.params.id);
        if (!report) return res.status(404).json({ error: 'Not found' });
        await report.destroy();
        res.json({ message: 'Deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
