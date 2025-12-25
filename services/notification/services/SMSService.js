import { createLogger } from '@tadbir-khowan/shared';

const logger = createLogger('sms-service');

export class SMSService {
  constructor() {
    this.apiKey = process.env.SMS_API_KEY;
    this.apiUrl = process.env.SMS_API_URL || 'https://api.sms-provider.com';
    this.sender = process.env.SMS_SENDER || 'TadbirKhowan';
  }

  async sendSMS(to, content, options = {}) {
    try {
      // Validate phone number format (Iranian mobile numbers)
      if (!this.isValidPhoneNumber(to)) {
        throw new Error('Invalid phone number format');
      }

      // For development/testing, we'll simulate SMS sending
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return this.simulateSMS(to, content);
      }

      // In production, integrate with actual SMS provider
      const response = await this.sendViaSMSProvider(to, content, options);
      
      logger.info('SMS sent successfully', { 
        to, 
        messageId: response.messageId 
      });

      return {
        success: true,
        messageId: response.messageId,
        response: response
      };
    } catch (error) {
      logger.error('Failed to send SMS', { 
        to, 
        error: error.message 
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendViaSMSProvider(to, content, options = {}) {
    // This would integrate with actual SMS provider like Kavenegar, Melipayamak, etc.
    // For now, we'll simulate the API call
    
    const payload = {
      receptor: to,
      message: content,
      sender: options.sender || this.sender,
      type: options.type || 1 // 1 for normal SMS, 2 for flash SMS
    };

    // Simulate API call
    const response = await fetch(`${this.apiUrl}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`SMS API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  simulateSMS(to, content) {
    // Simulate SMS sending for development/testing
    const messageId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('SMS simulated', { 
      to, 
      content: content.substring(0, 50) + '...', 
      messageId 
    });

    return {
      success: true,
      messageId,
      response: 'Simulated SMS delivery'
    };
  }

  isValidPhoneNumber(phoneNumber) {
    // Iranian mobile number validation
    // Format: +989xxxxxxxxx or 09xxxxxxxxx
    const iranianMobileRegex = /^(\+98|0)?9\d{9}$/;
    return iranianMobileRegex.test(phoneNumber);
  }

  formatPhoneNumber(phoneNumber) {
    // Convert to international format
    if (phoneNumber.startsWith('09')) {
      return '+98' + phoneNumber.substring(1);
    }
    if (phoneNumber.startsWith('9') && phoneNumber.length === 10) {
      return '+98' + phoneNumber;
    }
    return phoneNumber;
  }

  async sendBulkSMS(messages) {
    const results = [];
    
    for (const message of messages) {
      const result = await this.sendSMS(
        message.to,
        message.content,
        message.options
      );
      
      results.push({
        ...message,
        result
      });

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }

  async checkDeliveryStatus(messageId) {
    try {
      // In production, this would check with the SMS provider
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return {
          messageId,
          status: 'delivered',
          deliveredAt: new Date()
        };
      }

      // Simulate API call to check status
      const response = await fetch(`${this.apiUrl}/status/${messageId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to check SMS delivery status', { 
        messageId, 
        error: error.message 
      });
      return null;
    }
  }
}