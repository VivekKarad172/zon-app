const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { OrderItem, Order, Design, Color, User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

// Helper function to calculate date range
const getDateFilter = (days) => {
    if (!days || days === 'all') return null;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    return date;
};

// GET /analytics/popular-sizes - Most ordered door dimensions
router.get('/popular-sizes', authenticate, async (req, res) => {
    try {
        const { days = 30, limit = 20 } = req.query;

        const whereClause = {};
        const dateFilter = getDateFilter(days);
        if (dateFilter) {
            whereClause.createdAt = { [Op.gte]: dateFilter };
        }

        // Query to aggregate by size (width x height)
        const sizes = await OrderItem.findAll({
            attributes: [
                'width',
                'height',
                [OrderItem.sequelize.fn('SUM', OrderItem.sequelize.col('quantity')), 'totalOrdered'],
                [OrderItem.sequelize.fn('COUNT', OrderItem.sequelize.fn('DISTINCT', OrderItem.sequelize.col('OrderItem.orderId'))), 'orderCount']
            ],
            include: [{
                model: Order,
                attributes: [],
                where: whereClause
            }],
            group: ['width', 'height'],
            order: [[OrderItem.sequelize.literal('totalOrdered'), 'DESC']],
            limit: parseInt(limit),
            raw: true
        });

        // Format the results
        const formattedSizes = sizes.map((item, index) => ({
            rank: index + 1,
            size: `${item.width}" × ${item.height}"`,
            width: item.width,
            height: item.height,
            totalOrdered: parseInt(item.totalOrdered),
            orderCount: parseInt(item.orderCount),
            popularity: index < 5 ? 'hot' : index < 10 ? 'warm' : 'cool'
        }));

        res.json({
            period: days === 'all' ? 'All Time' : `Last ${days} days`,
            data: formattedSizes
        });
    } catch (error) {
        console.error('Popular Sizes Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /analytics/design-trends - Most ordered designs
router.get('/design-trends', authenticate, async (req, res) => {
    try {
        const { days = 30, limit = 20 } = req.query;

        const whereClause = {};
        const dateFilter = getDateFilter(days);
        if (dateFilter) {
            whereClause.createdAt = { [Op.gte]: dateFilter };
        }

        const designs = await OrderItem.findAll({
            attributes: [
                [OrderItem.sequelize.fn('SUM', OrderItem.sequelize.col('quantity')), 'totalOrdered'],
                [OrderItem.sequelize.fn('COUNT', OrderItem.sequelize.fn('DISTINCT', OrderItem.sequelize.col('OrderItem.orderId'))), 'orderCount']
            ],
            include: [
                {
                    model: Design,
                    attributes: ['id', 'designNumber', 'category', 'imageUrl'],
                    required: false
                },
                {
                    model: Order,
                    attributes: [],
                    where: whereClause
                }
            ],
            group: ['Design.id', 'Design.designNumber', 'Design.category', 'Design.imageUrl', 'OrderItem.designNameSnapshot'],
            order: [[OrderItem.sequelize.literal('totalOrdered'), 'DESC']],
            limit: parseInt(limit)
        });

        const formattedDesigns = designs.map((item, index) => ({
            rank: index + 1,
            designNumber: item.Design?.designNumber || item.designNameSnapshot || 'Unknown',
            category: item.Design?.category || 'N/A',
            imageUrl: item.Design?.imageUrl || null,
            totalOrdered: parseInt(item.dataValues.totalOrdered),
            orderCount: parseInt(item.dataValues.orderCount),
            popularity: index < 5 ? 'hot' : index < 10 ? 'warm' : 'cool'
        }));

        res.json({
            period: days === 'all' ? 'All Time' : `Last ${days} days`,
            data: formattedDesigns
        });
    } catch (error) {
        console.error('Design Trends Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /analytics/color-trends - Most ordered colors
router.get('/color-trends', authenticate, async (req, res) => {
    try {
        const { days = 30, limit = 20 } = req.query;

        const whereClause = {};
        const dateFilter = getDateFilter(days);
        if (dateFilter) {
            whereClause.createdAt = { [Op.gte]: dateFilter };
        }

        const colors = await OrderItem.findAll({
            attributes: [
                [OrderItem.sequelize.fn('SUM', OrderItem.sequelize.col('quantity')), 'totalOrdered'],
                [OrderItem.sequelize.fn('COUNT', OrderItem.sequelize.fn('DISTINCT', OrderItem.sequelize.col('OrderItem.orderId'))), 'orderCount']
            ],
            include: [
                {
                    model: Color,
                    attributes: ['id', 'name', 'imageUrl'],
                    required: false
                },
                {
                    model: Order,
                    attributes: [],
                    where: whereClause
                }
            ],
            group: ['Color.id', 'Color.name', 'Color.imageUrl', 'OrderItem.colorNameSnapshot'],
            order: [[OrderItem.sequelize.literal('totalOrdered'), 'DESC']],
            limit: parseInt(limit)
        });

        const formattedColors = colors.map((item, index) => ({
            rank: index + 1,
            colorName: item.Color?.name || item.colorNameSnapshot || 'Unknown',
            imageUrl: item.Color?.imageUrl || null,
            totalOrdered: parseInt(item.dataValues.totalOrdered),
            orderCount: parseInt(item.dataValues.orderCount),
            popularity: index < 5 ? 'hot' : index < 10 ? 'warm' : 'cool'
        }));

        res.json({
            period: days === 'all' ? 'All Time' : `Last ${days} days`,
            data: formattedColors
        });
    } catch (error) {
        console.error('Color Trends Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /analytics/sales-summary - Overall metrics
router.get('/sales-summary', authenticate, async (req, res) => {
    try {
        const { days = 30 } = req.query;

        const whereClause = {};
        const dateFilter = getDateFilter(days);
        if (dateFilter) {
            whereClause.createdAt = { [Op.gte]: dateFilter };
        }

        // Total orders
        const totalOrders = await Order.count({ where: whereClause });

        // Total units ordered
        const totalUnitsResult = await OrderItem.sum('quantity', {
            include: [{
                model: Order,
                attributes: [],
                where: whereClause
            }]
        });
        const totalUnits = totalUnitsResult || 0;

        // Orders by status
        const ordersByStatus = await Order.findAll({
            attributes: [
                'status',
                [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'count']
            ],
            where: whereClause,
            group: ['status'],
            raw: true
        });

        // Top dealer
        const topDealer = await OrderItem.findAll({
            attributes: [
                [OrderItem.sequelize.fn('SUM', OrderItem.sequelize.col('quantity')), 'totalOrdered']
            ],
            include: [{
                model: Order,
                attributes: [],
                where: whereClause,
                include: [{
                    model: User,
                    attributes: ['id', 'name', 'shopName', 'email']
                }]
            }],
            group: ['Order.User.id', 'Order.User.name', 'Order.User.shopName', 'Order.User.email'],
            order: [[OrderItem.sequelize.literal('totalOrdered'), 'DESC']],
            limit: 1
        });

        res.json({
            period: days === 'all' ? 'All Time' : `Last ${days} days`,
            summary: {
                totalOrders,
                totalUnits,
                ordersByStatus: ordersByStatus.reduce((acc, item) => {
                    acc[item.status] = parseInt(item.count);
                    return acc;
                }, {}),
                topDealer: topDealer[0] ? {
                    name: topDealer[0].Order?.User?.name || 'N/A',
                    shopName: topDealer[0].Order?.User?.shopName,
                    email: topDealer[0].Order?.User?.email,
                    totalOrdered: parseInt(topDealer[0].dataValues.totalOrdered)
                } : null
            }
        });
    } catch (error) {
        console.error('Sales Summary Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
