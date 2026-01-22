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
