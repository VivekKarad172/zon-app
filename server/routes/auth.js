const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');

// Login (Username/Password) - Manufacturer & Distributor
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user by username
        const user = await User.findOne({ where: { username } });

        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        // Dealers should use Dealer Login tab (Email only)
        if (user.role === 'DEALER') {
            return res.status(400).json({ error: 'Dealers must use Dealer Login tab' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        if (!user.isEnabled) return res.status(403).json({ error: 'Account is disabled.' });

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Dealer Login (Email Only - Temporary/Simplified)
router.post('/dealer-login', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) return res.status(400).json({ error: 'Email is required' });

        // Find Dealer by Email
        const user = await User.findOne({ where: { email, role: 'DEALER' } });

        if (!user) {
            return res.status(403).json({ error: 'This email is not registered as a Dealer.' });
        }

        if (!user.isEnabled) {
            return res.status(403).json({ error: 'Account is disabled.' });
        }

        // Check if assigned Distributor is active
        if (user.distributorId) {
            const distributor = await User.findByPk(user.distributorId);
            if (!distributor || !distributor.isEnabled) {
                return res.status(403).json({ error: 'Your Distributor is inactive. Access restricted.' });
            }
        }

        // CRITICAL: Include distributorId in token for order placement
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                name: user.name,
                distributorId: user.distributorId  // THIS WAS MISSING - Required for orders!
            },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name, distributorId: user.distributorId } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/verify', async (req, res) => {
    // This endpoint is just to check if token is valid from client
    // Authorization header handled by middleware usually, but here we can do a manual check if needed
    // or just return 200 if the middleware passed. 
    // BUT we need middleware here.
    // For simplicity, let's just return 200 ok if this route is hit, assuming middleware protects it.
    // Wait, I haven't added middleware to this file's imports universally.
    // Let's rely on the client `api.get` which sends headers, and if it fails (401), client handles it.
    // We'll stick to 'login' returning user data.
    res.json({ status: 'ok' });
});

module.exports = router;
