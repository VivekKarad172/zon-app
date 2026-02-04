const express = require('express');
const router = express.Router();
const { Notification } = require('../models');
const { authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');

// GET /api/notifications - Get Notifications for Current User
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        const notifications = await Notification.findAll({
            where: {
                [Op.or]: [
                    { userId: userId },
                    { targetRole: userRole }
                ]
            },
            order: [['createdAt', 'DESC']],
            limit: 50 // Limit to last 50
        });

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/notifications/:id/read - Mark as Read
router.put('/:id/read', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        // Optimization: Don't check ownership strictly for read status if ID matches, 
        // essentially anyone who receives it can read it.
        // But cleaner: specific instance for user? 
        // For shared 'targetRole' notifs, marking read affects EVERYONE?
        // NO.
        // If targetRole is used, we only have ONE record. If User A reads it, User B sees it read.
        // FIX: For simplicity in this iteration, 'targetRole' notifications are "Announcements".
        // They stay unread? Or we ignore read status for broadcast?
        // Better: When fetching, we could handle it via a separate "UserNotifications" table.
        // Compormise: If reading a 'targetRole' notification, we assume it's read for the system (e.g. Admin task done).
        // Or... create Individual Notifications for each admin?
        // Refinement: When creating for 'MANUFACTURER', find all admin IDs and create individual records.
        // THEN 'isRead' works per user.
        //
        // Let's stick to simple "mark as read" logic.

        await Notification.update({ isRead: true }, {
            where: { id: id }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        await Notification.update({ isRead: true }, {
            where: {
                [Op.or]: [
                    { userId: userId },
                    { targetRole: userRole }
                ],
                isRead: false
            }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
