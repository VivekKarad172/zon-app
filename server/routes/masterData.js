const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { DoorType, Design, Color, DesignColor, SheetMaster } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');
const { getDesignType } = require('../utils/designLogic');

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
    const where = req.user.role === 'MANUFACTURER' ? {} : { isEnabled: true };
    const doors = await DoorType.findAll({ where });
    res.json(doors);
});

router.post('/doors', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { name, thickness } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Door type name is required' });
        const existing = await DoorType.findOne({ where: { name: name.trim() } });
        if (existing) return res.status(400).json({ error: `Door type "${name}" already exists` });
        const door = await DoorType.create({ name: name.trim(), thickness: thickness || null, isEnabled: true });
        res.status(201).json(door);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/doors/:id', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const door = await DoorType.findByPk(req.params.id);
        if (!door) return res.status(404).json({ error: 'Door type not found' });
        const { name, thickness, isEnabled } = req.body;
        const updateData = {};
        if (name) updateData.name = name.trim();
        if (thickness !== undefined) updateData.thickness = thickness;
        if (isEnabled !== undefined) updateData.isEnabled = isEnabled === 'true' || isEnabled === true;
        await door.update(updateData);
        res.json(door);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/doors/:id', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const door = await DoorType.findByPk(req.params.id);
        if (!door) return res.status(404).json({ error: 'Door type not found' });
        // Check if any designs use this door type before deleting
        const inUse = await Design.count({ where: { doorTypeId: door.id } });
        if (inUse > 0) {
            // Soft-disable instead of hard delete to protect existing designs
            await door.update({ isEnabled: false });
            return res.json({ message: `"${door.name}" disabled (${inUse} designs use it — cannot delete)` });
        }
        await door.destroy();
        res.json({ message: `"${door.name}" deleted successfully` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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

// === BULK UPLOAD ROUTES ===

// Bulk Upload Foil Colors (from Excel - no images, just names)
router.post('/colors/bulk', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { colors } = req.body;
        if (!colors || !Array.isArray(colors) || colors.length === 0) {
            return res.status(400).json({ error: 'No colors data provided' });
        }

        let created = 0, skipped = 0;
        const errors = [];

        for (const item of colors) {
            const name = item.name?.toString().trim();
            if (!name) {
                skipped++;
                errors.push({ row: item, error: 'Missing name' });
                continue;
            }

            // Check if already exists
            const existing = await Color.findOne({ where: { name } });
            if (existing) {
                skipped++;
                errors.push({ row: item, error: 'Already exists' });
                continue;
            }

            await Color.create({
                name,
                hexCode: item.hexCode || '#888888',
                isEnabled: true
            });
            created++;
        }

        res.json({
            message: `${created} foil colors created, ${skipped} skipped`,
            created,
            skipped,
            errors
        });
    } catch (error) {
        console.error('Bulk color upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bulk Upload Designs (from Excel - no images, just design numbers)
router.post('/designs/bulk', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const { designs } = req.body;
        if (!designs || !Array.isArray(designs) || designs.length === 0) {
            return res.status(400).json({ error: 'No designs data provided' });
        }

        // Get default door type (first one)
        const defaultDoor = await DoorType.findOne();
        const defaultDoorId = defaultDoor?.id || 1;

        let created = 0, skipped = 0;
        const errors = [];

        for (const item of designs) {
            const designNumber = item.designNumber?.toString().trim() || item.name?.toString().trim();
            if (!designNumber) {
                skipped++;
                errors.push({ row: item, error: 'Missing designNumber' });
                continue;
            }

            // Check if already exists
            const existing = await Design.findOne({ where: { designNumber } });
            if (existing) {
                skipped++;
                errors.push({ row: item, error: 'Already exists' });
                continue;
            }

            // Find door type by name if provided
            let doorTypeId = defaultDoorId;
            if (item.doorType || item.material) {
                const doorName = (item.doorType || item.material).toString().trim();
                const door = await DoorType.findOne({ where: { name: { [Op.like]: `%${doorName}%` } } });
                if (door) doorTypeId = door.id;
            }

            await Design.create({
                designNumber,
                category: item.category || 'Standard',
                doorTypeId,
                isTrending: item.isTrending === true || item.isTrending === 'true',
                isEnabled: true
            });
            created++;
        }

        res.json({
            message: `${created} designs created, ${skipped} skipped`,
            created,
            skipped,
            errors
        });
    } catch (error) {
        console.error('Bulk design upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Auto-Categorize All Designs (Migration Tool)
// Auto-Categorize All Designs (Migration Tool)
router.post('/designs/auto-categorize', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const designs = await Design.findAll();
        // Fetch known Door Types for smart linking
        const wpcDoor = await DoorType.findOne({ where: { name: { [Op.like]: '%WPC%' } } });
        // Can add others if needed (e.g. Membrane)

        let updated = 0;

        for (const design of designs) {
            const newType = getDesignType(design.designNumber);
            const updateData = {};

            // 1. Update Category
            if (design.category !== newType) {
                updateData.category = newType;
            }

            // 2. Auto-Link WPC Door Type
            // If the Logic says it's WPC (CNC or PLAIN), move it to WPC Section
            if (wpcDoor && newType.includes('WPC')) {
                if (design.doorTypeId !== wpcDoor.id) {
                    updateData.doorTypeId = wpcDoor.id;
                }
            }

            // Execute Update
            if (Object.keys(updateData).length > 0) {
                await design.update(updateData);
                updated++;
            }
        }

        res.json({ message: `Scanned ${designs.length} designs. Updated ${updated} items (Linked WPC & Categories).` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- SHEET MASTERS MOVED TO server/routes/sheets.js ---

module.exports = router;

