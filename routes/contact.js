const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const rateLimit = require('express-rate-limit');
const emailService = require('../utils/emailService');

// Rate limiting for contact requests
const contactLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 contact requests per 15 minutes
    message: { error: 'Too many contact requests. Please try again later.' }
});

// POST /api/contact - Submit contact form
router.post('/', contactLimit, async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Create new contact
        const contact = new Contact({
            name,
            email,
            subject,
            message,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Save to database
        const savedContact = await contact.save();

        // Send email notifications
        try {
            // Send notification to you
            await emailService.sendContactNotification({ name, email, subject, message });
            
            // Send auto-reply to the contact person
            await emailService.sendAutoReply({ name, email, subject });
            
            console.log('✅ Email notifications sent successfully');
        } catch (emailError) {
            console.error('❌ Email notification failed:', emailError);
            // Don't fail the request if email fails, just log it
        }

        // Send success response
        res.status(201).json({
            success: true,
            message: 'Contact form submitted successfully! You will receive a confirmation email shortly.',
            data: {
                id: savedContact._id,
                name: savedContact.name,
                email: savedContact.email,
                subject: savedContact.subject,
                createdAt: savedContact.createdAt
            }
        });

        // Log successful submission
        console.log(`✅ New contact from ${name} (${email}): ${subject}`);

    } catch (error) {
        console.error('❌ Error submitting contact form:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }

        // Generic error response
        res.status(500).json({
            success: false,
            message: 'Failed to submit contact form. Please try again.'
        });
    }
});

// GET /api/contact - Get all contacts (admin only)
router.get('/', async (req, res) => {
    try {
        const { status, limit = 50, page = 1 } = req.query;
        
        const query = status ? { status } : {};
        const options = {
            limit: parseInt(limit),
            skip: (parseInt(page) - 1) * parseInt(limit),
            sort: { createdAt: -1 }
        };

        const contacts = await Contact.find(query, null, options);
        const total = await Contact.countDocuments(query);

        res.json({
            success: true,
            data: contacts,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('❌ Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contacts'
        });
    }
});

module.exports = router;
