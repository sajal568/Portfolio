const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    // Send email notification when someone contacts you
    async sendContactNotification(contactData) {
        const { name, email, subject, message } = contactData;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to your own email
            subject: `🔔 New Contact Form Submission: ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #ff6b35; margin-bottom: 20px; text-align: center;">
                            📧 New Contact Form Submission
                        </h2>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <h3 style="color: #333; margin-bottom: 15px;">Contact Details:</h3>
                            <p style="margin: 8px 0;"><strong>Name:</strong> ${name}</p>
                            <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #ff6b35;">${email}</a></p>
                            <p style="margin: 8px 0;"><strong>Subject:</strong> ${subject}</p>
                        </div>
                        
                        <div style="background-color: #fff; padding: 20px; border-left: 4px solid #ff6b35; margin-bottom: 20px;">
                            <h3 style="color: #333; margin-bottom: 15px;">Message:</h3>
                            <p style="line-height: 1.6; color: #555;">${message}</p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="mailto:${email}?subject=Re: ${subject}" 
                               style="background-color: #ff6b35; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                Reply to ${name}
                            </a>
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
                            <p>This email was sent from your portfolio contact form.</p>
                            <p>Timestamp: ${new Date().toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Contact notification email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending contact notification email:', error);
            return { success: false, error: error.message };
        }
    }

    // Send email notification when someone submits hire request
    async sendHireNotification(hireData) {
        const { name, email, company, projectType, projectDescription, budget, timeline } = hireData;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: `🚀 New Hire Request from ${name}${company ? ` (${company})` : ''}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #ff6b35; margin-bottom: 20px; text-align: center;">
                            🎯 New Hire Request!
                        </h2>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <h3 style="color: #333; margin-bottom: 15px;">Client Information:</h3>
                            <p style="margin: 8px 0;"><strong>Name:</strong> ${name}</p>
                            <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #ff6b35;">${email}</a></p>
                            ${company ? `<p style="margin: 8px 0;"><strong>Company:</strong> ${company}</p>` : ''}
                        </div>
                        
                        <div style="background-color: #fff; padding: 20px; border-left: 4px solid #28a745; margin-bottom: 20px;">
                            <h3 style="color: #333; margin-bottom: 15px;">Project Details:</h3>
                            <p style="margin: 8px 0;"><strong>Project Type:</strong> ${projectType}</p>
                            ${budget ? `<p style="margin: 8px 0;"><strong>Budget:</strong> ${budget}</p>` : ''}
                            ${timeline ? `<p style="margin: 8px 0;"><strong>Timeline:</strong> ${timeline}</p>` : ''}
                        </div>
                        
                        <div style="background-color: #fff; padding: 20px; border-left: 4px solid #ff6b35; margin-bottom: 20px;">
                            <h3 style="color: #333; margin-bottom: 15px;">Project Description:</h3>
                            <p style="line-height: 1.6; color: #555;">${projectDescription}</p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="mailto:${email}?subject=Re: Your Project Inquiry" 
                               style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
                                Accept Project
                            </a>
                            <a href="mailto:${email}?subject=Project Discussion - ${projectType}" 
                               style="background-color: #ff6b35; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                Discuss Details
                            </a>
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
                            <p>This email was sent from your portfolio hire form.</p>
                            <p>Timestamp: ${new Date().toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Hire notification email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending hire notification email:', error);
            return { success: false, error: error.message };
        }
    }

    // Send auto-reply to the person who contacted you
    async sendAutoReply(contactData) {
        const { name, email, subject } = contactData;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Thank you for contacting me, ${name}!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #ff6b35; margin-bottom: 20px; text-align: center;">
                            Thanks for reaching out!
                        </h2>
                        
                        <p style="font-size: 16px; line-height: 1.6; color: #333;">
                            Hi ${name},
                        </p>
                        
                        <p style="font-size: 16px; line-height: 1.6; color: #333;">
                            Thank you for your message regarding "<strong>${subject}</strong>". I've received your inquiry and will get back to you within 24 hours.
                        </p>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; color: #555; font-style: italic;">
                                "I'm excited to learn more about your project and explore how we can work together to bring your vision to life!"
                            </p>
                        </div>
                        
                        <p style="font-size: 16px; line-height: 1.6; color: #333;">
                            In the meantime, feel free to:
                        </p>
                        
                        <ul style="color: #333; line-height: 1.6;">
                            <li>Check out my <a href="https://www.facebook.com/sazalshrestha1" style="color: #ff6b35;">Facebook</a></li>
                            <li>Connect with me on <a href="https://www.linkedin.com/in/sajal-shrestha-683a33266/" style="color: #ff6b35;">LinkedIn</a></li>
                            <li>Follow my work on <a href="https://github.com/sajal568" style="color: #ff6b35;">GitHub</a></li>
                        </ul>
                        
                        <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 30px;">
                            Best regards,<br>
                            <strong style="color: #ff6b35;">Sazal</strong><br>
                            <small style="color: #888;">Full Stack Developer</small>
                        </p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
                            <p>This is an automated response. I'll reply personally soon!</p>
                        </div>
                    </div>
                </div>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Auto-reply email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending auto-reply email:', error);
            return { success: false, error: error.message };
        }
    }

    // Test email configuration
    async testConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email service is ready');
            return { success: true, message: 'Email service is ready' };
        } catch (error) {
            console.error('❌ Email service error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();
