const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Post } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, 'post-' + Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// GET All Posts (for Dealers/Distributors - only active)
router.get('/', authenticate, async (req, res) => {
    try {
        // Manufacturer sees all, others see only active
        const where = req.user.role === 'MANUFACTURER' ? {} : { isActive: true };
        const posts = await Post.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CREATE Post (Manufacturer only)
router.post('/', authenticate, authorize(['MANUFACTURER']), upload.single('image'), async (req, res) => {
    try {
        const { title, content, postType } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const post = await Post.create({
            title: title || null,
            content,
            postType: postType || 'announcement',
            imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
            isActive: true
        });

        res.status(201).json(post);
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: error.message });
    }
});

// UPDATE Post (Manufacturer only)
router.put('/:id', authenticate, authorize(['MANUFACTURER']), upload.single('image'), async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const { title, content, postType, isActive } = req.body;

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (postType !== undefined) updateData.postType = postType;
        if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;
        if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;

        await post.update(updateData);
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE Post (Manufacturer only)
router.delete('/:id', authenticate, authorize(['MANUFACTURER']), async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        await post.destroy();
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
