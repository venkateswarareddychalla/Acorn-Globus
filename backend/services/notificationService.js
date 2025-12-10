import fs from 'fs';
import path from 'path';
import db from '../models/database.js';

class NotificationService {
  constructor() {
    this.logFile = path.join(process.cwd(), 'notifications.log');
    this.ensureLogFile();
  }

  ensureLogFile() {
    if (!fs.existsSync(this.logFile)) {
      fs.writeFileSync(this.logFile, '# Notification Log\n', 'utf8');
    }
  }

  async sendBookingConfirmation(booking, user) {
    const subject = `Booking Confirmed - ${booking.booking_reference}`;
    const emailBody = `
Hi ${user.name},

Your booking is confirmed!

Court: ${booking.court_name}
Date: ${new Date(booking.start_time).toLocaleDateString()}
Time: ${new Date(booking.start_time).toLocaleTimeString()} - ${new Date(booking.end_time).toLocaleTimeString()}
Total: $${booking.total_price}

Reference: ${booking.booking_reference}

Thank you for choosing Acorn Globus!
    `;

    const smsBody = `Booking confirmed! ${booking.court_name} on ${new Date(booking.start_time).toLocaleDateString()}. Ref: ${booking.booking_reference}`;

    await this.sendEmail(user.email, subject, emailBody);
    if (user.phone) {
      await this.sendSMS(user.phone, smsBody);
    }
    await this.logToDatabase('booking_confirmed', user.id, booking.id, subject);
  }

  async sendCancellationNotice(booking, user, refundAmount) {
    const subject = `Booking Cancelled - ${booking.booking_reference}`;
    const emailBody = `
Hi ${user.name},

Your booking has been cancelled.

Court: ${booking.court_name}
Original Date: ${new Date(booking.start_time).toLocaleDateString()}
Refund Amount: $${refundAmount}

Reference: ${booking.booking_reference}

The refund will be processed within 3-5 business days.
    `;

    const smsBody = `Booking ${booking.booking_reference} cancelled. Refund: $${refundAmount}`;

    await this.sendEmail(user.email, subject, emailBody);
    if (user.phone) {
      await this.sendSMS(user.phone, smsBody);
    }
    await this.logToDatabase('booking_cancelled', user.id, booking.id, subject);
  }

  async sendPaymentReceipt(booking, user, payment) {
    const subject = `Payment Receipt - ${booking.booking_reference}`;
    const emailBody = `
Hi ${user.name},

Payment received successfully!

Amount: $${payment.amount}
Payment Method: ${payment.payment_method}
Transaction ID: ${payment.transaction_id}
Booking Reference: ${booking.booking_reference}

Thank you for your payment!
    `;

    await this.sendEmail(user.email, subject, emailBody);
    await this.logToDatabase('payment_success', user.id, booking.id, subject);
  }

  async sendEmail(to, subject, body) {
    const timestamp = new Date().toISOString();
    const log = `${timestamp} | EMAIL | ${to} | ${subject}`;
    
    // Console log with emoji for visibility
    console.log(`📧 ${log}`);
    
    // Write to file
    fs.appendFileSync(this.logFile, log + '\n', 'utf8');

    // TODO: Integrate SendGrid for production
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to,
    //   from: 'noreply@acornglobus.com',
    //   subject,
    //   text: body,
    //   html: body.replace(/\n/g, '<br>')
    // });
  }

  async sendSMS(phone, message) {
    const timestamp = new Date().toISOString();
    const log = `${timestamp} | SMS | ${phone} | ${message.substring(0, 50)}...`;
    
    // Console log with emoji for visibility
    console.log(`📱 ${log}`);
    
    // Write to file
    fs.appendFileSync(this.logFile, log + '\n', 'utf8');

    // TODO: Integrate Twilio for production
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   to: phone,
    //   from: process.env.TWILIO_PHONE,
    //   body: message
    // });
  }

  async logToDatabase(type, userId, bookingId, message) {
    try {
      const stmt = db.prepare(`
        INSERT INTO notifications (user_id, booking_id, type, title, message, channel, status, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(userId, bookingId, type, type, message, 'email', 'sent');
    } catch (error) {
      console.error('Failed to log notification to database:', error.message);
    }
  }
}

export default new NotificationService();
