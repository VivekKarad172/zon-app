const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { DoorType, Design, Color, DesignColor } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Helper to disable cache for images could be handled in frontend, 
// here we just save files with unique names (timestamp) so no cache issues.

// === DOOR TYPES ===
router.get('/doors', authenticate, async (req, res) => {
    // Admin sees all, Dealers sees enabled
    const where = req.user.role === 'MANUFACTURER' ? {} : { isEnabled: true };
    const doors = await DoorType.findAll({ where });
    res.json(doors);
});

// === GLOBAL COLORS ===
router.get('/colors', authenticate, async (req, res) => {
    const where = req.user.role === 'MANUFACTURER' ? {} : { isEnabled: true };
    const colors = await Color.findAll({ where });
    res.json(colors);
});

router.post('/colors', authenticate, authorize(['MANUFACTURER']), upload.single('image'), async (req, res) => {
    try {
        const { name, hexCode } = req.body;
        // Check duplicate name
        const existing = await Color.findOne({ where: { name } });
        if (existing) return res.status(400).json({ error: 'Color name already exists' });

        const color = await Color.create({
            name,
            hexCode,
            imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
            isEnabled: true
        });
        res.json(color);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Color (Full Edit)
router.put('/colors/:id', authenticate, authorize(['MANUFACTURER']), upload.single('image'), async (req, res) => {
    try {
        const { name, hexCode, isEnabled } = req.body;
        const color = await Color.findByPk(req.params.id);
        if (!color) return res.status(404).json({ error: 'Not found' });

        const updateData = {};
        if (name) updateData.name = name;
        if (hexCode) updateData.hexCode = hexCode;
        if (isEnabled !== undefined) updateData.isEnabled = isEnabled === 'true' || isEnabled === true;
        if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;

        // NOTE: We do NOT delete the old image file, so Snapshots in old orders remain valid.

        await color.update(updateData);
        res.json(color);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === DESIGNS ===
router.get('/designs', authenticate, async (req, res) => {
    const where = req.user.role === 'MANUFACTURER' ? {} : { isEnabled: true };
    const designs = await Design.findAll({
        where,
        include: [
            { model: DoorType },
            {
                model: Color,
                through: { attributes: [] },
                where: req.user.role !== 'MANUFACTURER' ? { isEnabled: true } : undefined,
                required: false
            }
        ]
    });
    res.json(designs);
});

router.post('/designs', authenticate, authorize(['MANUFACTURER']), upload.single('image'), async (req, res) => {
    try {
        const { designNumber, category, doorTypeId, isTrending, colorIds } = req.body;

        // Validation: Must have colors
        if (!colorIds || colorIds.length === 0) {
            return res.status(400).json({ error: 'Design must have at least one valid color linked.' });
        }

        // Check duplicate
        const existing = await Design.findOne({ where: { designNumber } });
        if (existing) return res.status(400).json({ error: 'Design Number already exists' });

        const design = await Design.create({
            designNumber,
            category,
            doorTypeId,
            isTrending: isTrending === 'true',
            imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
            isEnabled: true
        });

        // Link Colors
        const ids = Array.isArray(colorIds) ? colorIds : JSON.parse(colorIds);
        if (ids && ids.length > 0) {
            await design.setColors(ids);
        }

        res.json(design);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Update Design (Full Edit)
router.put('/designs/:id', authenticate, authorize(['MANUFACTURER']), upload.single('image'), async (req, res) => {
    try {
        const { designNumber, category, doorTypeId, isTrending, colorIds, isEnabled } = req.body;
        const design = await Design.findByPk(req.params.id);
        if (!design) return res.status(404).json({ error: 'Not found' });

        const updateData = {};
        if (designNumber) updateData.designNumber = designNumber;
        if (category) updateData.category = category;
        if (doorTypeId) updateData.doorTypeId = doorTypeId;
        if (isTrending !== undefined) updateData.isTrending = isTrending === 'true' || isTrending === true;
        if (isEnabled !== undefined) updateData.isEnabled = isEnabled === 'true' || isEnabled === true;
        if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;

        await design.update(updateData);

        if (colorIds) {
            const ids = Array.isArray(colorIds) ? colorIds : JSON.parse(colorIds);
            await design.setColors(ids);
        }

        res.json(design);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Legacy Link API (keep if needed, otherwise superseded by PUT /designs/:id)
router.put('/designs/:id/colors', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const design = await Design.findByPk(req.params.id);
        const { colorIds } = req.body;
        await design.setColors(colorIds);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === DELETE ROUTES ===

// Delete Color
router.delete('/colors/:id', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const color = await Color.findByPk(req.params.id);
        if (!color) return res.status(404).json({ error: 'Color not found' });

        await color.destroy();
        res.json({ message: 'Color deleted successfully' });
    } catch (error) {
        console.error('Delete color error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete Design
router.delete('/designs/:id', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const design = await Design.findByPk(req.params.id);
        if (!design) return res.status(404).json({ error: 'Design not found' });

        // Remove color associations first
        await design.setColors([]);

        await design.destroy();
        res.json({ message: 'Design deleted successfully' });
    } catch (error) {
        console.error('Delete design error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
