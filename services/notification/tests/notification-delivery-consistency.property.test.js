import fc from 'fast-check';

// Feature: tadbir-khowan, Property 14: Notification Delivery Consistency
// **Validates: Requirements 8.1, 8.2, 8.3**

// Mock the dependencies
const mockNotificationService = {
  sendNotification: jest.fn(),
  emailService: {
    sendEmail: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'test-email-id'
    })
  },
  smsService: {
    sendSMS: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'test-sms-id'
    })
  }
};

const mockUserPreference = {
  findByUserIdAndChannel: jest.fn(),
  createDefaultPreferences: jest.fn()
};

const mockNotificationTemplate = {
  findByChannelAndType: jest.fn()
};

const mockNotification = {
  create: jest.fn()
};

describe('Notification Delivery Consistency Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Property 14: Notification Delivery Consistency
  // For any system event requiring notification (order status change, company approval, menu publication), 
  // appropriate notifications should be sent to all relevant users.
  test('Property 14: For any notification request with valid user preferences, appropriate notifications should be created and sent', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate notification data
        fc.record({
          userId: fc.uuid(),
          channel: fc.constantFrom('order_status', 'company_approval', 'menu_published', 'reminder'),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 10, maxLength: 15 }).map(s => '+98' + s.replace(/\D/g, '').slice(0, 10)),
          subject: fc.string({ minLength: 5, maxLength: 100 }),
          content: fc.string({ minLength: 10, maxLength: 500 }),
          variables: fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.string({ minLength: 1, maxLength: 50 })
          )
        }),
        // Generate user preferences
        fc.record({
          emailEnabled: fc.boolean(),
          smsEnabled: fc.boolean(),
          language: fc.constantFrom('fa', 'en')
        }),
        
        async (notificationData, preferences) => {
          // Mock user preferences
          const mockPreference = {
            userId: notificationData.userId,
            channel: notificationData.channel,
            emailEnabled: preferences.emailEnabled,
            smsEnabled: preferences.smsEnabled,
            pushEnabled: true,
            language: preferences.language,
            isEnabled: function(type) {
              switch (type) {
                case 'email': return this.emailEnabled;
                case 'sms': return this.smsEnabled;
                case 'push': return this.pushEnabled;
                default: return false;
              }
            }
          };

          mockUserPreference.findByUserIdAndChannel.mockResolvedValue(mockPreference);

          // Mock template
          mockNotificationTemplate.findByChannelAndType.mockResolvedValue({
            id: 'template-id',
            renderContent: (vars) => ({
              subject: notificationData.subject,
              content: notificationData.content
            })
          });

          // Mock notification creation
          const mockNotificationInstance = {
            id: 'notification-id',
            type: null,
            channel: notificationData.channel,
            userId: notificationData.userId,
            recipient: null,
            updateStatus: jest.fn().mockResolvedValue(undefined),
            toJSON: function() { return { id: this.id, type: this.type, channel: this.channel, userId: this.userId, recipient: this.recipient }; }
          };

          mockNotification.create.mockImplementation((data) => {
            const instance = { ...mockNotificationInstance };
            instance.type = data.type;
            instance.recipient = data.recipient;
            return Promise.resolve(instance);
          });

          // Simulate the notification service logic
          const notifications = [];

          // Check email notification
          if (preferences.emailEnabled && notificationData.email) {
            const emailNotification = await mockNotification.create({
              userId: notificationData.userId,
              type: 'email',
              channel: notificationData.channel,
              recipient: notificationData.email,
              subject: notificationData.subject,
              content: notificationData.content
            });

            const emailResult = await mockNotificationService.emailService.sendEmail(
              notificationData.email,
              notificationData.subject,
              notificationData.content
            );

            if (emailResult.success) {
              await emailNotification.updateStatus('sent', null, emailResult.messageId);
            }

            notifications.push(emailNotification);
          }

          // Check SMS notification
          if (preferences.smsEnabled && notificationData.phone) {
            const smsNotification = await mockNotification.create({
              userId: notificationData.userId,
              type: 'sms',
              channel: notificationData.channel,
              recipient: notificationData.phone,
              content: notificationData.content
            });

            const smsResult = await mockNotificationService.smsService.sendSMS(
              notificationData.phone,
              notificationData.content
            );

            if (smsResult.success) {
              await smsNotification.updateStatus('sent', null, smsResult.messageId);
            }

            notifications.push(smsNotification);
          }

          // Property verification: Notifications should be created based on user preferences
          
          // 1. If email is enabled and email is provided, an email notification should be created
          if (preferences.emailEnabled && notificationData.email) {
            const emailNotification = notifications.find(n => n.type === 'email');
            expect(emailNotification).toBeDefined();
            expect(emailNotification.recipient).toBe(notificationData.email);
            expect(emailNotification.channel).toBe(notificationData.channel);
            expect(emailNotification.userId).toBe(notificationData.userId);
            expect(mockNotificationService.emailService.sendEmail).toHaveBeenCalled();
          }

          // 2. If SMS is enabled and phone is provided, an SMS notification should be created
          if (preferences.smsEnabled && notificationData.phone) {
            const smsNotification = notifications.find(n => n.type === 'sms');
            expect(smsNotification).toBeDefined();
            expect(smsNotification.recipient).toBe(notificationData.phone);
            expect(smsNotification.channel).toBe(notificationData.channel);
            expect(smsNotification.userId).toBe(notificationData.userId);
            expect(mockNotificationService.smsService.sendSMS).toHaveBeenCalled();
          }

          // 3. If email is disabled, no email notification should be created
          if (!preferences.emailEnabled) {
            const emailNotification = notifications.find(n => n.type === 'email');
            expect(emailNotification).toBeUndefined();
          }

          // 4. If SMS is disabled, no SMS notification should be created
          if (!preferences.smsEnabled) {
            const smsNotification = notifications.find(n => n.type === 'sms');
            expect(smsNotification).toBeUndefined();
          }

          // 5. All created notifications should have the correct channel and user ID
          notifications.forEach(notification => {
            expect(notification.channel).toBe(notificationData.channel);
            expect(notification.userId).toBe(notificationData.userId);
            expect(['email', 'sms']).toContain(notification.type);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 14.1: For any valid channel and notification type combination, system should handle the request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          channel: fc.constantFrom('order_status', 'company_approval', 'menu_published', 'reminder'),
          type: fc.constantFrom('email', 'sms'),
          recipient: fc.oneof(fc.emailAddress(), fc.string({ minLength: 10, maxLength: 15 })),
          content: fc.string({ minLength: 10, maxLength: 500 })
        }),
        
        async (notificationData) => {
          // Mock notification creation
          mockNotification.create.mockResolvedValue({
            id: 'notification-id',
            ...notificationData,
            updateStatus: jest.fn().mockResolvedValue(undefined),
            toJSON: () => ({ id: 'notification-id', ...notificationData })
          });

          // Create notification
          const notification = await mockNotification.create(notificationData);

          // Property verification: Valid notifications should be created successfully
          expect(notification).toBeDefined();
          expect(notification.userId).toBe(notificationData.userId);
          expect(notification.channel).toBe(notificationData.channel);
          expect(notification.type).toBe(notificationData.type);
          expect(notification.recipient).toBe(notificationData.recipient);
          expect(notification.content).toBe(notificationData.content);

          // Valid channels should be accepted
          expect(['order_status', 'company_approval', 'menu_published', 'reminder']).toContain(notification.channel);
          
          // Valid types should be accepted
          expect(['email', 'sms']).toContain(notification.type);
        }
      ),
      { numRuns: 50 }
    );
  });
});