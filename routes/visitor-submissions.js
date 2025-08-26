const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const { authMiddleware } = require('../middleware/authMiddleware');

// Simple test route to verify the file is being loaded
router.get('/test', (req, res) => {
    console.log('Visitor submissions test route hit!');
    res.json({ success: true, message: 'Visitor submissions route is working!' });
});

// POST /api/visitor-submissions - Create a new visitor submission (public)
router.post('/', express.json(), async (req, res) => {
    try {
        const { name, email, phone, company, purpose, message } = req.body;
        
        // Basic validation
        if (!name || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name and email are required' 
            });
        }

        // Create visitor with additional data
        const visitorData = {
            name,
            email,
            phone: phone || '',
            company: company || '',
            purpose: purpose || 'general',
            message: message || '',
            source: req.get('Referer') || 'direct',
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip || req.connection.remoteAddress
        };

        console.log('Creating visitor with data:', visitorData);
        const visitor = await Visitor.create(visitorData);
        
        console.log('Visitor created successfully:', visitor);
        return res.status(201).json({ 
            success: true, 
            message: 'Visitor information saved successfully',
            data: { id: visitor._id }
        });
    } catch (error) {
        console.error('Error saving visitor:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to save visitor information',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/visitor-submissions - Get all visitor submissions (protected)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        const query = {};
        
        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } }
            ];
        }

        const options = {
            page: parseInt(page, 10),
            limit: Math.min(parseInt(limit, 10), 100),
            sort: { createdAt: -1 },
            lean: true
        };

        const visitors = await Visitor.paginate(query, options);
        
        res.json({
            success: true,
            data: visitors.docs,
            pagination: {
                total: visitors.totalDocs,
                page: visitors.page,
                pages: visitors.totalPages,
                limit: visitors.limit
            }
        });
    } catch (error) {
        console.error('Error fetching visitors:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch visitor data' 
        });
    }
});

// PATCH /api/visitor-submissions/:id/status - Update visitor status (protected)
router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['new', 'contacted', 'ignored'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status value' 
            });
        }

        const visitor = await Visitor.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true }
        );

        if (!visitor) {
            return res.status(404).json({ 
                success: false, 
                message: 'Visitor not found' 
            });
        }

        res.json({ 
            success: true, 
            data: visitor 
        });
    } catch (error) {
        console.error('Error updating visitor status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update visitor status' 
        });
    }
});

// Export the router
module.exports = router;
