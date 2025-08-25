const mongoose = require('mongoose');

// Website Analytics Schema
const analyticsSchema = new mongoose.Schema({
    // Visitor Information
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    country: String,
    city: String,
    device: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown'],
        default: 'unknown'
    },
    browser: String,
    os: String,
    
    // Visit Details
    visitDate: {
        type: Date,
        default: Date.now
    },
    pageViews: [{
        page: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        timeSpent: Number // in seconds
    }],
    totalTimeSpent: {
        type: Number,
        default: 0 // in seconds
    },
    
    // User Actions
    actions: [{
        type: {
            type: String,
            enum: ['click', 'scroll', 'form_view', 'form_submit', 'download', 'external_link']
        },
        element: String, // button id, link href, etc.
        timestamp: {
            type: Date,
            default: Date.now
        },
        data: mongoose.Schema.Types.Mixed // additional action data
    }],
    
    // Conversion Tracking
    hiredMe: {
        type: Boolean,
        default: false
    },
    subscribedNewsletter: {
        type: Boolean,
        default: false
    },
    downloadedCV: {
        type: Boolean,
        default: false
    },
    contactedMe: {
        type: Boolean,
        default: false
    },
    
    // Referral Information
    referrer: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    
    // Session Status
    isActive: {
        type: Boolean,
        default: true
    },
    lastActivity: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for better performance
analyticsSchema.index({ visitDate: -1 });
analyticsSchema.index({ ipAddress: 1 });
analyticsSchema.index({ hiredMe: 1 });
analyticsSchema.index({ subscribedNewsletter: 1 });

// Daily Summary Schema for aggregated data
const dailySummarySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        unique: true
    },
    totalVisitors: {
        type: Number,
        default: 0
    },
    uniqueVisitors: {
        type: Number,
        default: 0
    },
    totalPageViews: {
        type: Number,
        default: 0
    },
    averageTimeSpent: {
        type: Number,
        default: 0
    },
    hireRequests: {
        type: Number,
        default: 0
    },
    newsletterSubscriptions: {
        type: Number,
        default: 0
    },
    contactMessages: {
        type: Number,
        default: 0
    },
    cvDownloads: {
        type: Number,
        default: 0
    },
    topPages: [{
        page: String,
        views: Number
    }],
    topReferrers: [{
        referrer: String,
        count: Number
    }],
    deviceBreakdown: {
        desktop: { type: Number, default: 0 },
        mobile: { type: Number, default: 0 },
        tablet: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

dailySummarySchema.index({ date: -1 });

module.exports = {
    Analytics: mongoose.model('Analytics', analyticsSchema),
    DailySummary: mongoose.model('DailySummary', dailySummarySchema)
};
