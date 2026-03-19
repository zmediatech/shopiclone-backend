
const Order = require('../models/Order');
const Store = require('../models/Store');
const StoreVisit = require('../models/StoreVisit');
const mongoose = require('mongoose');

// Helper to get date ranges
const getDateRanges = (days) => {
    const currentEnd = new Date();
    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - days);

    const prevEnd = new Date(currentStart);
    const prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - days);

    return { currentStart, currentEnd, prevStart, prevEnd };
};

// Helper to calculate percentage change
const calculateTrend = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return (((current - previous) / previous) * 100).toFixed(1);
};

// Helper to get store
const getStore = async (req) => {
    if (req.store) return req.store;
    return await Store.findOne({ ownerId: req.user.id });
};

exports.getAnalyticsSummary = async (req, res) => {
    try {
        const store = await getStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const storeId = store._id;
        const days = parseInt(req.query.days) || 7;
        const { currentStart, currentEnd, prevStart, prevEnd } = getDateRanges(days);

        // 1. Current Period Aggregation
        const currentStats = await Order.aggregate([
            { $match: { storeId: new mongoose.Types.ObjectId(storeId), createdAt: { $gte: currentStart, $lte: currentEnd } } },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$total' },
                    totalOrders: { $count: {} },
                    avgOrderValue: { $avg: '$total' }
                }
            }
        ]);

        // 2. Previous Period Aggregation
        const prevStats = await Order.aggregate([
            { $match: { storeId: new mongoose.Types.ObjectId(storeId), createdAt: { $gte: prevStart, $lte: prevEnd } } },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$total' },
                    totalOrders: { $count: {} },
                    avgOrderValue: { $avg: '$total' }
                }
            }
        ]);

        const current = currentStats[0] || { totalSales: 0, totalOrders: 0, avgOrderValue: 0 };
        const previous = prevStats[0] || { totalSales: 0, totalOrders: 0, avgOrderValue: 0 };

        // 3. Sessions and Conversion (Real from StoreVisit)
        const currentSessions = await StoreVisit.countDocuments({ storeId, createdAt: { $gte: currentStart, $lte: currentEnd } });
        const prevSessions = await StoreVisit.countDocuments({ storeId, createdAt: { $gte: prevStart, $lte: prevEnd } });

        const currentConv = currentSessions > 0 ? (current.totalOrders / currentSessions * 100).toFixed(2) : 0;
        const prevConv = prevSessions > 0 ? (previous.totalOrders / prevSessions * 100).toFixed(2) : 0;

        res.json({
            totalSales: { value: current.totalSales, trend: calculateTrend(current.totalSales, previous.totalSales) },
            totalOrders: { value: current.totalOrders, trend: calculateTrend(current.totalOrders, previous.totalOrders) },
            avgOrderValue: { value: current.avgOrderValue, trend: calculateTrend(current.avgOrderValue, previous.avgOrderValue) },
            sessions: { value: currentSessions, trend: calculateTrend(currentSessions, prevSessions) },
            conversionRate: { value: currentConv, trend: calculateTrend(parseFloat(currentConv), parseFloat(prevConv)) }
        });
    } catch (error) {
        console.error('SERVER ERROR - getAnalyticsSummary:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getSalesOverTime = async (req, res) => {
    try {
        const store = await getStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const storeId = store._id;
        const days = parseInt(req.query.days) || 7;
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        const sales = await Order.aggregate([
            {
                $match: {
                    storeId: new mongoose.Types.ObjectId(storeId),
                    createdAt: { $gte: dateLimit }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    sales: { $sum: '$total' },
                    orders: { $count: {} }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Fill in missing days with 0
        const allDays = [];
        for (let i = 0; i <= days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const existing = sales.find(s => s._id === dateStr);
            allDays.push({
                _id: dateStr,
                sales: existing ? existing.sales : 0,
                orders: existing ? existing.orders : 0
            });
        }
        allDays.sort((a, b) => a._id.localeCompare(b._id));

        res.json(allDays);
    } catch (error) {
        console.error('SERVER ERROR - getSalesOverTime:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getSalesHourly = async (req, res) => {
    try {
        const store = await getStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const storeId = store._id;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const sales = await Order.aggregate([
            {
                $match: {
                    storeId: new mongoose.Types.ObjectId(storeId),
                    createdAt: { $gte: startOfDay }
                }
            },
            {
                $group: {
                    _id: { $hour: "$createdAt" },
                    sales: { $sum: '$total' },
                    orders: { $count: {} }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Fill in missing hours with 0
        const hourlyData = Array.from({ length: 24 }, (_, i) => {
            const hourData = sales.find(s => s._id === i);
            return {
                time: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
                sales: hourData ? hourData.sales : 0,
                orders: hourData ? hourData.orders : 0
            };
        });

        res.json(hourlyData);
    } catch (error) {
        console.error('SERVER ERROR - getSalesHourly:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getTopProducts = async (req, res) => {
    try {
        const store = await getStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const storeId = store._id;
        const days = parseInt(req.query.days) || 7;
        const { currentStart, currentEnd } = getDateRanges(days);

        const topProducts = await Order.aggregate([
            {
                $match: {
                    storeId: new mongoose.Types.ObjectId(storeId),
                    createdAt: { $gte: currentStart, $lte: currentEnd }
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId",
                    name: { $first: "$items.name" },
                    totalSales: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                    totalUnits: { $sum: "$items.quantity" },
                    image: { $first: "$items.image" }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);

        res.json(topProducts);
    } catch (error) {
        console.error('SERVER ERROR - getTopProducts:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getDemographics = async (req, res) => {
    try {
        const store = await getStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const storeId = store._id;
        const days = parseInt(req.query.days) || 7;
        const { currentStart, currentEnd } = getDateRanges(days);

        // Top Locations from Orders
        const locations = await Order.aggregate([
            {
                $match: {
                    storeId: new mongoose.Types.ObjectId(storeId),
                    createdAt: { $gte: currentStart, $lte: currentEnd }
                }
            },
            {
                $group: {
                    _id: "$city",
                    count: { $count: {} }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // Device Stats from StoreVisit
        const devices = await StoreVisit.aggregate([
            {
                $match: {
                    storeId: new mongoose.Types.ObjectId(storeId),
                    createdAt: { $gte: currentStart, $lte: currentEnd }
                }
            },
            {
                $group: {
                    _id: "$device",
                    count: { $count: {} }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({ locations, devices });
    } catch (error) {
        console.error('SERVER ERROR - getDemographics:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.trackVisit = async (req, res) => {
    try {
        const { storeId, device, path, referrer } = req.body;
        if (!storeId) return res.status(400).json({ message: 'Store ID required' });

        await StoreVisit.create({
            storeId: new mongoose.Types.ObjectId(storeId),
            ip: req.ip,
            device: device || 'unknown',
            path,
            referrer
        });

        res.status(204).send();
    } catch (error) {
        console.error('SERVER ERROR - trackVisit:', error);
        res.status(500).json({ message: error.message });
    }
};
