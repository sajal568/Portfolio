const express = require('express');
const router = express.Router();
const emailService = require('../utils/emailService');

// Test email endpoint
router.post('/test', async (req, res) => {
    try {
        // Test email connection
        const connectionTest = await emailService.testConnection();
        
        if (!connectionTest.success) {
            return res.status(500).json({
                success: false,
                message: 'Email service connection failed',
                error: connectionTest.error
            });
        }

        // Send test email
        const testEmailResult = await emailService.sendContactNotification({
            name: 'Test User',
            email: 'test@example.com',
            subject: 'Email Service Test',
            message: 'This is a test message to verify the email service is working correctly.'
        });

        if (testEmailResult.success) {
            res.json({
                success: true,
                message: 'Test email sent successfully!',
                messageId: testEmailResult.messageId
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send test email',
                error: testEmailResult.error
            });
        }

    } catch (error) {
        console.error('❌ Email test error:', error);
        res.status(500).json({
            success: false,
            message: 'Email test failed',
            error: error.message
        });
    }
});

module.exports = router;
