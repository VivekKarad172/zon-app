const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Worker, ProductionUnit, sequelize } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

// GET /workers/stats - Factory Floor Status
router.get('/stats', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const stats = await ProductionUnit.findAll({
            attributes: ['currentStage', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['currentStage']
        });

        const result = {
            PVC_CUT: 0, FOIL_PASTING: 0, EMBOSS: 0, DOOR_MAKING: 0, PACKING: 0
        };

        stats.forEach(row => {
            result[row.currentStage] = parseInt(row.get('count'));
        });

        res.json(result);
    } catch (error) {
        console.error('Stats Error:', error);
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

module.exports = router;
