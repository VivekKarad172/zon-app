require('dotenv').config();
// Force Restart for Analytics Permission Update
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: true, // Allow all origins for Mobile App access
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug: Log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${req.ip}`);
    next();
});

// Routes (Placeholder)
// Serve Static Files (React App)
app.use(express.static(path.join(__dirname, '../client/dist')));

// (Moved Catch-All to bottom)

// Import Routes
const authRoutes = require('./routes/auth');
const masterDataRoutes = require('./routes/masterData');
const orderRoutes = require('./routes/orders');
const usersRoutes = require('./routes/users');
const postsRoutes = require('./routes/posts'); // NEW: What's New
const seed = require('./seed');

app.use('/api/auth', authRoutes);
app.use('/api', masterDataRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/posts', postsRoutes); // NEW: What's New
app.use('/api/workers', require('./routes/workers')); // FACTORY SYSTEM
app.use('/api/analytics', require('./routes/analytics')); // NEW: Analytics & Reports

// TEMPORARY: Seed Database via URL
app.get('/api/seed', async (req, res) => {
    try {
        await seed();
        res.send('<h1>Database Seeded Successfully!</h1><p>You can now login as admin/admin123</p>');
    } catch (err) {
        console.error(err);
        res.status(500).send('Seeding Failed: ' + err.message);
    }
});

// PROPER PLACEMENT: Handle React Routing (SPA Catch-All) - AFTER API Routes
app.get(/(.*)/, (req, res) => {
    // If request is for API, don't return HTML (404 instead) but we are at the end so it IS a 404
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ message: 'API Route not found' });
    }
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Sync Database and Start Server
// Reverted to standard sync to prevent FK constraint errors
// ENABLE ALTER for Schema Update (Foil Pasting Columns) - DISABLED LOCALLY DUE TO SQLITE ERROR
sequelize.sync().then(() => {
    console.log('Database connected and schema updated.');
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Database connection failed:', err);
});
