const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = '255657544771-f83qrosah74t147ln3iden1r195u3m7s.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '255657544771-fekgq291uqqvbqujqc9oe38dskp9madp.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Google OAuth Login
router.post('/google', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token is required' });

        // Verify token with both Web and Android audiences
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: [GOOGLE_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID]
        });
        const payload = ticket.getPayload();
        const email = payload.email;
        const name = payload.name;

        // Check if user exists
        let user = await User.findOne({ where: { email } });

        if (!user) {
            // DEFAULT ROLE SYSTEM:
            // Change these emails later to give your team instant admin access!
            const adminEmails = ['admin@zondoor.com'];
            const managerEmails = ['manager@zondoor.com'];
            const workerEmails = ['worker@zondoor.com'];
            const distributorEmails = ['distributor@zondoor.com'];

            let role = 'DEALER'; // Default fallback
            
            if (adminEmails.includes(email.toLowerCase())) role = 'MANUFACTURER';
            else if (managerEmails.includes(email.toLowerCase())) role = 'MANAGER';
            else if (workerEmails.includes(email.toLowerCase())) role = 'WORKER';
            else if (distributorEmails.includes(email.toLowerCase())) role = 'DISTRIBUTOR';

            // Auto-register the new user
            user = await User.create({
                email,
                name: name || 'Google User',
                role,
                isEnabled: true
            });
        }

        if (!user.isEnabled) return res.status(403).json({ error: 'Account is disabled.' });

        const jwtToken = jwt.sign(
            { id: user.id, role: user.role, name: user.name, distributorId: user.distributorId },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        res.json({ token: jwtToken, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ error: 'Invalid Google Login' });
    }
});

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

// Dealer Login (Email + Password if set, Email-only for legacy accounts)
router.post('/dealer-login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email) return res.status(400).json({ error: 'Email is required' });

        const user = await User.findOne({ where: { email, role: 'DEALER' } });

        if (!user) {
            return res.status(403).json({ error: 'This email is not registered as a Dealer.' });
        }

        if (!user.isEnabled) {
            return res.status(403).json({ error: 'Account is disabled.' });
        }

        // If dealer has a password set, require it
        if (user.password) {
            if (!password) {
                return res.status(400).json({ error: 'Password is required.', requiresPassword: true });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Incorrect password.' });
            }
        }
        // If no password set on account, allow email-only (legacy / admin-created accounts)

        // Check if assigned Distributor is active
        if (user.distributorId) {
            const distributor = await User.findByPk(user.distributorId);
            if (!distributor || !distributor.isEnabled) {
                return res.status(403).json({ error: 'Your Distributor is inactive. Access restricted.' });
            }
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name, distributorId: user.distributorId },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user.id, email: user.email, role: user.role, name: user.name, distributorId: user.distributorId },
            hasPassword: !!user.password
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/verify', authenticate, async (req, res) => {
    const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'username', 'email', 'role', 'name', 'shopName', 'city', 'distributorId', 'isEnabled']
    });
    if (!user || !user.isEnabled) {
        return res.status(403).json({ error: 'Account is disabled.' });
    }
    res.json({ status: 'ok', user });
});

// UPDATE PROFILE (Name, Shop, Password)
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { name, shopName, city, currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Update Basic Info
        if (name) user.name = name;
        if (shopName) user.shopName = shopName;
        if (city) user.city = city;

        // Update Password (Only if provided AND role is not DEALER)
        // Dealers login via Email only, so they don't manage passwords here.
        if (newPassword && user.role !== 'DEALER') {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password is required to set a new one.' });
            }

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Current password is incorrect.' });
            }

            user.password = await bcrypt.hash(newPassword, 10);
        }

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                shopName: user.shopName,
                city: user.city
            }
        });

    } catch (error) {
        console.error('Profile Update Error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;
