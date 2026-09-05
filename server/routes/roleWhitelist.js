const express = require('express');
const router = express.Router();
const { RoleWhitelist } = require('../models');
const { authenticate } = require('../middleware/auth');

// GET all whitelist entries (Admin only)
router.get('/', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'MANUFACTURER') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const entries = await RoleWhitelist.findAll({ order: [['role', 'ASC'], ['email', 'ASC']] });
        res.json(entries);
    } catch (error) {
        console.error('RoleWhitelist GET error:', error);
        res.status(500).json({ error: 'Failed to fetch role whitelist' });
    }
});

// ADD a new whitelist entry (Admin only)
router.post('/', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'MANUFACTURER') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { email, role, label } = req.body;
        if (!email || !role) {
            return res.status(400).json({ error: 'Email and role are required' });
        }

        // Check if email already exists
        const existing = await RoleWhitelist.findOne({ where: { email: email.toLowerCase() } });
        if (existing) {
            return res.status(409).json({ error: 'This email is already in the whitelist' });
        }

        const entry = await RoleWhitelist.create({
            email: email.toLowerCase(),
            role,
            label: label || null
        });

        res.status(201).json(entry);
    } catch (error) {
        console.error('RoleWhitelist POST error:', error);
        res.status(500).json({ error: 'Failed to add to whitelist' });
    }
});

// DELETE a whitelist entry (Admin only)
router.delete('/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'MANUFACTURER') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const entry = await RoleWhitelist.findByPk(req.params.id);
        if (!entry) return res.status(404).json({ error: 'Entry not found' });

        await entry.destroy();
        res.json({ message: 'Removed from whitelist' });
    } catch (error) {
        console.error('RoleWhitelist DELETE error:', error);
        res.status(500).json({ error: 'Failed to remove from whitelist' });
    }
});

module.exports = router;
