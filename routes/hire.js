const express = require('express');
const router = express.Router();
const HireRequest = require('../models/HireRequest');
const rateLimit = require('express-rate-limit');
const emailService = require('../utils/emailService');
const { Analytics } = require('../models/Analytics');

// Rate limiting for hire requests
const hireLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 hire requests per hour
    message: { error: 'Too many hire requests. Please try again later.' }
});

// POST /api/hire - Submit hire request
router.post('/', hireLimit, async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            company,
            projectType,
            projectDescription,
            budget,
            timeline,
            additionalInfo,
            newsletter,
            sessionId
        } = req.body;

        // Create new hire request
        const hireRequest = new HireRequest({
            name,
            email,
            phone,
            company,
            projectType,
            projectDescription,
            budget,
            timeline,
            additionalInfo,
            newsletter: newsletter || false,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Save to database
        const savedRequest = await hireRequest.save();

        // Link to analytics session if provided
        if (sessionId) {
            try {
                const $set = {
                    name: name || undefined,
                    email: email || undefined,
                    hireRequestId: savedRequest._id,
                    lastActivity: new Date()
                };
                if (newsletter === true) {
                    $set.subscribedNewsletter = true;
                }
                await Analytics.findOneAndUpdate(
                    { sessionId },
                    { $set }
                );
            } catch (linkErr) {
                console.warn('Analytics link (hire) failed:', linkErr.message);
            }
        }

        // Send email notification
        try {
            await emailService.sendHireNotification({
                name,
                email,
                company,
                projectType,
                projectDescription,
                budget,
                timeline
            });
            
            console.log('✅ Hire notification email sent successfully');
        } catch (emailError) {
            console.error('❌ Hire notification email failed:', emailError);
            // Don't fail the request if email fails, just log it
        }

        // Send success response
        res.status(201).json({
            success: true,
            message: 'Hire request submitted successfully! I will contact you soon.',
            data: {
                id: savedRequest._id,
                name: savedRequest.name,
                email: savedRequest.email,
                projectType: savedRequest.projectType,
                createdAt: savedRequest.createdAt
            }
        });

        // Log successful submission
        console.log(`✅ New hire request from ${name} (${email})`);

    } catch (error) {
        console.error('❌ Error submitting hire request:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }

        // Handle duplicate email (if you add unique constraint)
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'A request with this email already exists'
            });
        }

        // Generic error response
        res.status(500).json({
            success: false,
            message: 'Failed to submit hire request. Please try again.'
        });
    }
});

// GET /api/hire - Get all hire requests (admin only - add authentication later)
router.get('/', async (req, res) => {
    try {
        const { status, limit = 50, page = 1 } = req.query;
        
        const query = status ? { status } : {};
        const options = {
            limit: parseInt(limit),
            skip: (parseInt(page) - 1) * parseInt(limit),
            sort: { createdAt: -1 }
        };

        const requests = await HireRequest.find(query, null, options);
        const total = await HireRequest.countDocuments(query);

        res.json({
            success: true,
            data: requests,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('❌ Error fetching hire requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch hire requests'
        });
    }
});

// GET /api/hire/:id - Get specific hire request
router.get('/:id', async (req, res) => {
    try {
        const request = await HireRequest.findById(req.params.id);
        
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Hire request not found'
            });
        }

        res.json({
            success: true,
            data: request
        });
    } catch (error) {
        console.error('❌ Error fetching hire request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch hire request'
        });
    }
});

// PUT /api/hire/:id/status - Update hire request status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        
        const request = await HireRequest.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Hire request not found'
            });
        }

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: request
        });
    } catch (error) {
        console.error('❌ Error updating hire request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update hire request'
        });
    }
});

module.exports = router;
