const express = require('express');
const router = express.Router();
const { Analytics, DailySummary } = require('../models/Analytics');
const rateLimit = require('express-rate-limit');

// Rate limiting for analytics tracking (proxy-friendly)
const analyticsLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many analytics requests.' }
});

// Helper function to detect device type
const detectDevice = (userAgent) => {
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile';
    return 'desktop';
};

// Helper function to extract browser info
const getBrowserInfo = (userAgent) => {
    let browser = 'unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';
    
    let os = 'unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';
    
    return { browser, os };
};

// Middleware to ensure DB is connected
const ensureDB = (req, res, next) => {
    if (require('mongoose').connection.readyState !== 1) {
        return res.status(500).json({ success: false, message: 'Database disconnected' });
    }
    next();
};

// POST /visit
router.post('/visit', analyticsLimit, ensureDB, async (req, res) => {
    try {
        const { sessionId, referrer, utmSource, utmMedium, utmCampaign } = req.body;
        const userAgent = req.get('User-Agent') || '';
        const { browser, os } = getBrowserInfo(userAgent);
        let analytics = await Analytics.findOne({ sessionId });

        if (!analytics) {
            analytics = new Analytics({
                sessionId,
                ipAddress: req.ip,
                userAgent,
                device: detectDevice(userAgent),
                browser,
                os,
                referrer,
                utmSource,
                utmMedium,
                utmCampaign
            });
            await analytics.save();
        }
        res.json({ success: true, sessionId: analytics.sessionId });
    } catch (error) {
        console.error('❌ Error tracking visit:', error);
        res.status(500).json({ success: false, message: 'Failed to track visit' });
    }
});

// POST /page-view
router.post('/page-view', analyticsLimit, ensureDB, async (req, res) => {
    try {
        const { sessionId, page, timeSpent } = req.body;
        const analytics = await Analytics.findOne({ sessionId });
        if (!analytics) return res.status(404).json({ success: false, message: 'Session not found' });

        analytics.pageViews.push({ page, timeSpent: timeSpent || 0 });
        if (timeSpent) analytics.totalTimeSpent += timeSpent;
        analytics.lastActivity = new Date();
        await analytics.save();
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error tracking page view:', error);
        res.status(500).json({ success: false, message: 'Failed to track page view' });
    }
});

// POST /action
router.post('/action', analyticsLimit, ensureDB, async (req, res) => {
    try {
        const { sessionId, type, element, data } = req.body;
        const analytics = await Analytics.findOne({ sessionId });
        if (!analytics) return res.status(404).json({ success: false, message: 'Session not found' });

        analytics.actions.push({ type, element, data });

        if (type === 'form_submit') {
            if (element === 'hire-form') analytics.hiredMe = true;
            if (element === 'contact-form') analytics.contactedMe = true;
            if (element === 'newsletter-form') analytics.subscribedNewsletter = true;
        } else if (type === 'download' && element === 'cv-download') {
            analytics.downloadedCV = true;
        }

        analytics.lastActivity = new Date();
        await analytics.save();
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error tracking action:', error);
        res.status(500).json({ success: false, message: 'Failed to track action' });
    }
});

// GET /dashboard
router.get('/dashboard', ensureDB, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const totalVisitors = await Analytics.countDocuments({ visitDate: { $gte: startDate } });
        const uniqueVisitors = await Analytics.distinct('ipAddress', { visitDate: { $gte: startDate } }).then(a => a.length);
        const hireRequests = await Analytics.countDocuments({ hiredMe: true, visitDate: { $gte: startDate } });
        const newsletterSubs = await Analytics.countDocuments({ subscribedNewsletter: true, visitDate: { $gte: startDate } });
        const contactMessages = await Analytics.countDocuments({ contactedMe: true, visitDate: { $gte: startDate } });
        const cvDownloads = await Analytics.countDocuments({ downloadedCV: true, visitDate: { $gte: startDate } });

        const deviceStats = await Analytics.aggregate([
            { $match: { visitDate: { $gte: startDate } } },
            { $group: { _id: '$device', count: { $sum: 1 } } }
        ]);

        const topPages = await Analytics.aggregate([
            { $match: { visitDate: { $gte: startDate } } },
            { $unwind: '$pageViews' },
            { $group: { _id: '$pageViews.page', views: { $sum: 1 } } },
            { $sort: { views: -1 } },
            { $limit: 10 }
        ]);

        const dailyVisitors = await Analytics.aggregate([
            { $match: { visitDate: { $gte: startDate } } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
                visitors: { $sum: 1 },
                uniqueVisitors: { $addToSet: '$ipAddress' }
            }},
            { $addFields: { uniqueCount: { $size: '$uniqueVisitors' } } },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                summary: {
                    totalVisitors,
                    uniqueVisitors,
                    hireRequests,
                    newsletterSubscriptions: newsletterSubs,
                    contactMessages,
                    cvDownloads,
                    conversionRate: totalVisitors ? ((hireRequests / totalVisitors) * 100).toFixed(2) : 0
                },
                deviceBreakdown: deviceStats,
                topPages,
                dailyVisitors
            }
        });
    } catch (error) {
        console.error('❌ Error fetching dashboard data:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
    }
});

// GET /stats
router.get('/stats', ensureDB, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayVisitors = await Analytics.countDocuments({ visitDate: { $gte: today } });
        const totalVisitors = await Analytics.countDocuments();
        const totalHires = await Analytics.countDocuments({ hiredMe: true });
        const totalNewsletterSubs = await Analytics.countDocuments({ subscribedNewsletter: true });

        res.json({
            success: true,
            data: {
                todayVisitors,
                totalVisitors,
                totalHires,
                totalNewsletterSubscriptions: totalNewsletterSubs
            }
        });
    } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
});

module.exports = router;
