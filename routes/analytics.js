const express = require('express');
const router = express.Router();
const { Analytics, DailySummary } = require('../models/Analytics');
const rateLimit = require('express-rate-limit');

// Rate limiting for analytics tracking
const analyticsLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 analytics requests per minute
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

// POST /api/analytics/visit - Track new visitor
router.post('/visit', analyticsLimit, async (req, res) => {
    try {
        const { sessionId, referrer, utmSource, utmMedium, utmCampaign } = req.body;
        const userAgent = req.get('User-Agent') || '';
        const { browser, os } = getBrowserInfo(userAgent);
        
        // Check if session already exists
        let analytics = await Analytics.findOne({ sessionId });
        
        if (!analytics) {
            // Create new analytics record
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

// POST /api/analytics/page-view - Track page view
router.post('/page-view', analyticsLimit, async (req, res) => {
    try {
        const { sessionId, page, timeSpent } = req.body;
        
        const analytics = await Analytics.findOne({ sessionId });
        if (!analytics) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }
        
        // Add page view
        analytics.pageViews.push({
            page,
            timeSpent: timeSpent || 0
        });
        
        // Update total time spent
        if (timeSpent) {
            analytics.totalTimeSpent += timeSpent;
        }
        
        analytics.lastActivity = new Date();
        await analytics.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error tracking page view:', error);
        res.status(500).json({ success: false, message: 'Failed to track page view' });
    }
});

// POST /api/analytics/action - Track user action
router.post('/action', analyticsLimit, async (req, res) => {
    try {
        const { sessionId, type, element, data } = req.body;
        
        const analytics = await Analytics.findOne({ sessionId });
        if (!analytics) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }
        
        // Add action
        analytics.actions.push({
            type,
            element,
            data
        });
        
        // Update conversion flags based on action
        switch (type) {
            case 'form_submit':
                if (element === 'hire-form') {
                    analytics.hiredMe = true;
                }
                if (element === 'contact-form') {
                    analytics.contactedMe = true;
                }
                if (element === 'newsletter-form') {
                    analytics.subscribedNewsletter = true;
                }
                break;
            case 'download':
                if (element === 'cv-download') {
                    analytics.downloadedCV = true;
                }
                break;
        }
        
        analytics.lastActivity = new Date();
        await analytics.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error tracking action:', error);
        res.status(500).json({ success: false, message: 'Failed to track action' });
    }
});

// GET /api/analytics/dashboard - Get analytics dashboard data
router.get('/dashboard', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        
        // Get basic stats
        const totalVisitors = await Analytics.countDocuments({ visitDate: { $gte: startDate } });
        const uniqueVisitors = await Analytics.distinct('ipAddress', { visitDate: { $gte: startDate } }).then(ips => ips.length);
        const hireRequests = await Analytics.countDocuments({ hiredMe: true, visitDate: { $gte: startDate } });
        const newsletterSubs = await Analytics.countDocuments({ subscribedNewsletter: true, visitDate: { $gte: startDate } });
        const contactMessages = await Analytics.countDocuments({ contactedMe: true, visitDate: { $gte: startDate } });
        const cvDownloads = await Analytics.countDocuments({ downloadedCV: true, visitDate: { $gte: startDate } });
        
        // Get device breakdown
        const deviceStats = await Analytics.aggregate([
            { $match: { visitDate: { $gte: startDate } } },
            { $group: { _id: '$device', count: { $sum: 1 } } }
        ]);
        
        // Get top pages
        const topPages = await Analytics.aggregate([
            { $match: { visitDate: { $gte: startDate } } },
            { $unwind: '$pageViews' },
            { $group: { _id: '$pageViews.page', views: { $sum: 1 } } },
            { $sort: { views: -1 } },
            { $limit: 10 }
        ]);
        
        // Get daily visitors for chart
        const dailyVisitors = await Analytics.aggregate([
            { $match: { visitDate: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
                    visitors: { $sum: 1 },
                    uniqueVisitors: { $addToSet: '$ipAddress' }
                }
            },
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
                    conversionRate: totalVisitors > 0 ? ((hireRequests / totalVisitors) * 100).toFixed(2) : 0
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

// GET /api/analytics/stats - Get quick stats
router.get('/stats', async (req, res) => {
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
