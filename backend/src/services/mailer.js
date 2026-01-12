// backend/src/services/mailer.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(email, firstName) {
    const mailOptions = {
        from: `"BlockEstate" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Welcome to BlockEstate - Real Estate Tokenization Platform',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #10b981 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to BlockEstate!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p>Hi ${firstName},</p>
          <p>Thank you for joining BlockEstate - the premier platform for tokenized real estate investments.</p>
          <p>With BlockEstate, you can:</p>
          <ul>
            <li>Invest in fractional real estate shares starting from just 0.1 MATIC</li>
            <li>Track your portfolio in real-time</li>
            <li>Trade shares on the secondary market</li>
          </ul>
          <p><a href="${process.env.FRONTEND_URL}/marketplace" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Explore Properties</a></p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">If you have any questions, reply to this email.</p>
        </div>
      </div>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Welcome email sent to:', email);
        return { success: true };
    } catch (error) {
        console.error('Email send failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send investment confirmation email
 */
export async function sendInvestmentConfirmation(email, firstName, propertyTitle, shares, amount, txHash) {
    const mailOptions = {
        from: `"BlockEstate" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Investment Confirmed: ${shares} shares of ${propertyTitle}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #10b981; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Investment Successful! 🎉</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p>Hi ${firstName},</p>
          <p>Your investment in <strong>${propertyTitle}</strong> has been confirmed!</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Transaction Details</h3>
            <p><strong>Property:</strong> ${propertyTitle}</p>
            <p><strong>Shares Purchased:</strong> ${shares}</p>
            <p><strong>Amount Paid:</strong> ${amount} MATIC</p>
            <p><strong>Transaction ID:</strong> <code>${txHash}</code></p>
          </div>
          
          <p>View your transaction on PolygonScan:</p>
          <p><a href="https://amoy.polygonscan.com/tx/${txHash}" style="color: #2563eb;">${txHash.slice(0, 20)}...</a></p>
          
          <p><a href="${process.env.FRONTEND_URL}/dashboard" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a></p>
        </div>
      </div>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Investment confirmation sent to:', email);
        return { success: true };
    } catch (error) {
        console.error('Email send failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send property verification certificate email
 */
export async function sendVerificationCertificate(email, firstName, propertyTitle, propertyId, certificateUrl) {
    const mailOptions = {
        from: `"BlockEstate Admin" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Property Approved: ${propertyTitle} - Verification Certificate`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #10b981; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Property Approved! ✅</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p>Hi ${firstName},</p>
          <p>Great news! Your property <strong>${propertyTitle}</strong> has been verified and approved for tokenization.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981;">
            <h3 style="margin-top: 0; color: #10b981;">Verification Certificate</h3>
            <p><strong>Property ID:</strong> ${propertyId}</p>
            <p><strong>Status:</strong> VERIFIED & TOKENIZED</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>Your property is now live on the marketplace and investors can start purchasing shares.</p>
          
          <p><a href="${process.env.FRONTEND_URL}/marketplace" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View on Marketplace</a></p>
        </div>
      </div>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Verification certificate sent to:', email);
        return { success: true };
    } catch (error) {
        console.error('Email send failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send rejection notice email
 */
export async function sendRejectionNotice(email, firstName, propertyTitle, reason, deadline) {
    const mailOptions = {
        from: `"BlockEstate Admin" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Action Required: ${propertyTitle} - Verification Issue`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Action Required ⚠️</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p>Hi ${firstName},</p>
          <p>We've reviewed your property submission for <strong>${propertyTitle}</strong> and found some issues that need to be addressed.</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #92400e;">Issue Details</h3>
            <p>${reason}</p>
          </div>
          
          <p><strong>Response Deadline:</strong> ${deadline}</p>
          <p>Please respond within 10 days or your request will be automatically rejected.</p>
          
          <p>You can either:</p>
          <ul>
            <li>Reply to this email with corrected documents</li>
            <li>Contact us to discuss the issue</li>
          </ul>
          
          <p><a href="mailto:${process.env.SMTP_USER}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Contact Support</a></p>
        </div>
      </div>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Rejection notice sent to:', email);
        return { success: true };
    } catch (error) {
        console.error('Email send failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Test email configuration
 */
export async function testEmailConnection() {
    try {
        await transporter.verify();
        return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export default {
    sendWelcomeEmail,
    sendInvestmentConfirmation,
    sendVerificationCertificate,
    sendRejectionNotice,
    testEmailConnection
};
