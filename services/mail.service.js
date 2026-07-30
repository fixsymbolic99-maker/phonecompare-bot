const nodemailer = require('nodemailer');
const config = require('../config/config');

class MailService {
  constructor() {
    this.transporter = nodemailer.createTransport(config.EMAIL);
  }

  async sendPriceAlert(to, subject, html) {
    if (!this.transporter.options.auth.user) {
      console.warn('Mail credentials not configured, skipping email');
      return;
    }
    try {
      const info = await this.transporter.sendMail({
        from: `"PhoneCompare Bot" <${config.EMAIL.auth.user}>`,
        to,
        subject,
        html
      });
      console.log('Email sent:', info.messageId);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}

module.exports = new MailService();
