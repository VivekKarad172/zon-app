const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, Order, sequelize } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Helper for file logging
const logToFile = (msg) => {
    try {
        const logPath = path.join(__dirname, '../debug.log');
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
    } catch (e) {
        console.error('Logging failed:', e);
    }
};

// GET Users by Role
router.get('/', authenticate, authorize(['MANUFACTURER', 'DISTRIBUTOR']), async (req, res) => {
    try {
        logToFile('--- GET /users REQUEST ---');

        const { role } = req.query;
        const where = {};

        // If Distributor, restrict to their dealers
        if (req.user.role === 'DISTRIBUTOR') {
            where.distributorId = req.user.id;
            where.role = 'DEALER';
        } else if (role) {
            where.role = role;
        }

        const users = await User.findAll({
            where,
            attributes: { exclude: ['password'] },
            include: [{
                model: User,
                as: 'Distributor',
                attributes: ['name', 'shopName']
            }],
            order: [['createdAt', 'DESC']]
        });

        // Manually calculate order counts to be safe against SQL alias issues
        const usersWithCounts = await Promise.all(users.map(async (u) => {
            const userJson = u.toJSON();
            try {
                let count = 0;
                if (userJson.role === 'DISTRIBUTOR') {
                    count = await Order.count({ where: { distributorId: userJson.id } });
                } else if (userJson.role === 'DEALER') {
                    count = await Order.count({ where: { userId: userJson.id } });
                }
                userJson.orderCount = count;
            } catch (err) {
                console.error('Count Error:', err);
                userJson.orderCount = 0;
            }
            return userJson;
        }));

        logToFile(`Found ${usersWithCounts.length} users.`);
        res.json(usersWithCounts);
    } catch (error) {
        console.error('GET /users ERROR:', error);
        logToFile(`ERROR: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// CREATE User
router.post('/', authenticate, authorize(['MANUFACTURER', 'DISTRIBUTOR']), async (req, res) => {
    try {
        // DEBUG: Log incoming request
        console.log('=== CREATE USER REQUEST ===');
        console.log('Body:', req.body);
        console.log('User making request:', req.user);

        let { username, password, role, name, city, shopName, distributorId, email, isEnabled } = req.body;

        // Common Validation
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Name is required' });
        }

        // ROLE INFERENCE & SECURITY for DISTRIBUTOR
        let targetRole = role;

        if (req.user.role === 'DISTRIBUTOR') {
            // Distributors can ONLY create Dealers assigned to themselves
            targetRole = 'DEALER';
            distributorId = req.user.id; // Force assignment
        } else if (!targetRole) {
            // Manufacturer logic
            if (distributorId || email) {
                targetRole = 'DEALER';
            } else {
                targetRole = 'DISTRIBUTOR';
            }
        }

        // ----------------------------------------------------------------
        // ROLE SPECIFIC CONTRACT ENFORCEMENT
        // ----------------------------------------------------------------

        // 1. DISTRIBUTOR CONTRACT
        if (targetRole === 'DISTRIBUTOR') {
            // Required Fields
            if (!username || username.trim() === '') {
                return res.status(400).json({ error: 'Distributor must have a Username' });
            }
            if (!password || password.trim() === '') {
                return res.status(400).json({ error: 'Distributor must have a Password' });
            }

            // Uniqueness Check
            const existingUser = await User.findOne({ where: { username } });
            if (existingUser) {
                return res.status(400).json({ error: `Username '${username}' is already taken. Please choose another.` });
            }
        }

        // 2. DEALER CONTRACT
        else if (targetRole === 'DEALER') {
            if (!email || email.trim() === '') {
                return res.status(400).json({ error: 'Dealers must have an Email Address' });
            }
            if (!distributorId) {
                return res.status(400).json({ error: 'Dealer must be assigned to a Distributor' });
            }

            // Uniqueness Check
            const existingEmail = await User.findOne({ where: { email } });
            if (existingEmail) {
                return res.status(400).json({ error: `Email '${email}' is already registered.` });
            }
        } else {
            return res.status(400).json({ error: 'Invalid Role Specified' });
        }

        // ----------------------------------------------------------------
        // EXECUTION
        // ----------------------------------------------------------------

        let hashedPassword = null;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        // STRICT: Set explicit nulls based on role to prevent data contamination
        const user = await User.create({
            role: targetRole,
            name: name,
            city: city || null,
            shopName: shopName || null,
            isEnabled: isEnabled !== undefined ? isEnabled : true,
            // Role-specific fields with explicit null handling:
            username: targetRole === 'DISTRIBUTOR' ? username : null,
            password: targetRole === 'DISTRIBUTOR' ? hashedPassword : null,
            email: targetRole === 'DEALER' ? email : null,
            distributorId: targetRole === 'DEALER' ? distributorId : null
            // NOTE: createdBy removed - field does not exist in User model
        });

        res.status(201).json({ message: 'User created successfully', id: user.id });

    } catch (error) {
        console.error("User Create Error:", error);

        // Catch Sequelize Unique Constraints just in case race condition
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Username or Email matches an existing record.' });
        }

        res.status(500).json({ error: 'Server Error: ' + error.message });
    }
});

// UPDATE User
router.put('/:id', authenticate, authorize(['MANUFACTURER', 'DISTRIBUTOR']), async (req, res) => {
    try {
        const { name, city, shopName, distributorId, isEnabled, password, email, username } = req.body;
        const user = await User.findByPk(req.params.id);

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Authorization Check for Distributor
        if (req.user.role === 'DISTRIBUTOR') {
            // Allow updating SELF
            if (user.id === req.user.id) {
                // Distributor updating themselves - Allowed
            } else if (user.role === 'DEALER' && user.distributorId === req.user.id) {
                // Distributor updating their own Dealer - Allowed
            } else {
                return res.status(403).json({ error: 'Unauthorized to update this user' });
            }
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (city) updateData.city = city;
        if (shopName) updateData.shopName = shopName;
        // Distributor cannot change their own distributorId (it's null anyway)
        if (distributorId && user.role === 'DEALER' && req.user.role === 'MANUFACTURER') updateData.distributorId = distributorId;

        // Distributors cannot disable themselves, only dealers
        if (isEnabled !== undefined) {
            if (req.user.role === 'DISTRIBUTOR' && user.id === req.user.id) {
                // Ignore isEnabled for self
            } else {
                updateData.isEnabled = isEnabled;
            }
        }

        // Credential Updates
        if (password) updateData.password = await bcrypt.hash(password, 10);

        if (email && user.role === 'DEALER') {
            if (email !== user.email) {
                const exists = await User.findOne({ where: { email } });
                if (exists) return res.status(400).json({ error: 'Email already in use' });
                updateData.email = email;
            }
        }

        // Allow Distributor to update their own username
        if (username && (user.role !== 'DEALER' || req.user.role === 'MANUFACTURER')) {
            if (username !== user.username) {
                const exists = await User.findOne({ where: { username } });
                if (exists) return res.status(400).json({ error: 'Username taken' });
                updateData.username = username;
            }
        }

        await user.update(updateData);
        res.json({ message: 'User updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE User
router.delete('/:id', authenticate, authorize(['MANUFACTURER', 'DISTRIBUTOR']), async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Authorization Check
        if (req.user.role === 'DISTRIBUTOR') {
            // Can only delete their own dealers
            if (user.role !== 'DEALER' || user.distributorId !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized to delete this user' });
            }
        }

        // Prevent deleting self (sanity check)
        if (user.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }

        await user.destroy();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete Error:', error);
        res.status(500).json({ error: 'Server error during deletion' });
    }
});

// BULK CREATE Users (from CSV data)
router.post('/bulk', authenticate, authorize(['MANUFACTURER', 'DISTRIBUTOR']), async (req, res) => {
    try {
        const { users, role } = req.body; // users = array of user objects, role = 'DISTRIBUTOR' or 'DEALER'

        if (!users || !Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ error: 'No users provided' });
        }

        // Validate target role
        if (!['DISTRIBUTOR', 'DEALER'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be DISTRIBUTOR or DEALER' });
        }

        // Security check for Distributors
        if (req.user.role === 'DISTRIBUTOR' && role !== 'DEALER') {
            return res.status(403).json({ error: 'Distributors can only bulk create Dealers' });
        }

        const results = { success: 0, failed: 0, errors: [] };

        for (let i = 0; i < users.length; i++) {
            const userData = users[i];
            try {
                // Determine effective distributorId
                let effectiveDistributorId = userData.distributorId;
                if (req.user.role === 'DISTRIBUTOR') {
                    effectiveDistributorId = req.user.id;
                }

                // Validate based on role
                if (role === 'DISTRIBUTOR') {
                    if (!userData.name || !userData.username || !userData.password) {
                        results.failed++;
                        results.errors.push({ row: i + 1, error: 'Missing required fields (name, username, password)' });
                        continue;
                    }
                    // Check duplicate username
                    const exists = await User.findOne({ where: { username: userData.username } });
                    if (exists) {
                        results.failed++;
                        results.errors.push({ row: i + 1, error: `Username '${userData.username}' already exists` });
                        continue;
                    }
                    // Create Distributor
                    const hashedPassword = await bcrypt.hash(userData.password.toString(), 10);
                    await User.create({
                        role: 'DISTRIBUTOR',
                        name: userData.name,
                        username: userData.username,
                        password: hashedPassword,
                        city: userData.city || null,
                        shopName: userData.shopName || null,
                        isEnabled: true
                    });
                    results.success++;
                } else if (role === 'DEALER') {
                    if (!userData.name || !userData.email || !effectiveDistributorId) {
                        results.failed++;
                        results.errors.push({ row: i + 1, error: 'Missing required fields (name, email, distributorId)' });
                        continue;
                    }
                    // Check duplicate email
                    const exists = await User.findOne({ where: { email: userData.email } });
                    if (exists) {
                        results.failed++;
                        results.errors.push({ row: i + 1, error: `Email '${userData.email}' already exists` });
                        continue;
                    }

                    // Look up Distributor ID if name provided instead of ID
                    let finalDistributorId = effectiveDistributorId;
                    if (role === 'DEALER' && isNaN(parseInt(effectiveDistributorId))) {
                        // User likely provided a name, try to find it
                        const dist = await User.findOne({
                            where: {
                                role: 'DISTRIBUTOR',
                                name: { [Op.like]: `%${effectiveDistributorId}%` }
                            }
                        });
                        if (dist) {
                            finalDistributorId = dist.id;
                        } else {
                            results.failed++;
                            results.errors.push({ row: i + 1, error: `Distributor '${effectiveDistributorId}' not found` });
                            continue;
                        }
                    }

                    // Create Dealer
                    await User.create({
                        role: 'DEALER',
                        name: userData.name,
                        email: userData.email,
                        distributorId: parseInt(finalDistributorId),
                        city: userData.city || null,
                        shopName: userData.shopName || null,
                        isEnabled: true
                    });
                    results.success++;
                }
            } catch (err) {
                results.failed++;
                results.errors.push({ row: i + 1, error: err.message });
            }
        }

        res.json({
            message: `Bulk upload complete: ${results.success} created, ${results.failed} failed`,
            ...results
        });
    } catch (error) {
        console.error('Bulk create error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
