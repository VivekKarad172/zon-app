const express = require('express');
const app = express();

try {
    const masterRoutes = require('./routes/masterData');
    app.use('/api/masters', masterRoutes);
    console.log('Master Routes Loaded Successfully.');
    process.exit(0);
} catch (error) {
    console.error('Route Load Failed:', error);
    process.exit(1);
}
