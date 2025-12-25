import { NotificationTemplate } from '../models/NotificationTemplate.js';

export const defaultTemplates = [
  // Order Status Templates - Email
  {
    name: 'Order Confirmed - Email (Persian)',
    type: 'email',
    channel: 'order_status',
    language: 'fa',
    subject: 'تایید سفارش شما - تدبیرخوان',
    content: `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif;">
        <h2>سلام {{userName}}،</h2>
        <p>سفارش شما با موفقیت ثبت شد.</p>
        <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px;">
          <h3>جزئیات سفارش:</h3>
          <p><strong>شماره سفارش:</strong> {{orderNumber}}</p>
          <p><strong>تاریخ تحویل:</strong> {{deliveryDate}}</p>
          <p><strong>مبلغ کل:</strong> {{totalAmount}} تومان</p>
        </div>
        <p>با تشکر،<br>تیم تدبیرخوان</p>
      </div>
    `,
    variables: ['userName', 'orderNumber', 'deliveryDate', 'totalAmount']
  },
  
  // Order Status Templates - SMS
  {
    name: 'Order Confirmed - SMS (Persian)',
    type: 'sms',
    channel: 'order_status',
    language: 'fa',
    content: 'سلام {{userName}}، سفارش شما ({{orderNumber}}) تایید شد. تاریخ تحویل: {{deliveryDate}}. مبلغ: {{totalAmount}} تومان. تدبیرخوان',
    variables: ['userName', 'orderNumber', 'deliveryDate', 'totalAmount']
  },

  // Company Approval Templates - Email
  {
    name: 'Company Approved - Email (Persian)',
    type: 'email',
    channel: 'company_approval',
    language: 'fa',
    subject: 'تایید ثبت‌نام شرکت - تدبیرخوان',
    content: `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif;">
        <h2>تبریک {{companyName}}!</h2>
        <p>درخواست ثبت‌نام شرکت شما در سامانه تدبیرخوان تایید شد.</p>
        <div style="background: #e8f5e8; padding: 15px; margin: 10px 0; border-radius: 5px;">
          <h3>اطلاعات شرکت:</h3>
          <p><strong>نام شرکت:</strong> {{companyName}}</p>
          <p><strong>کد شرکت:</strong> {{companyCode}}</p>
        </div>
        <p>اکنون می‌توانید کارمندان خود را به سیستم اضافه کنید.</p>
        <p>با تشکر،<br>تیم تدبیرخوان</p>
      </div>
    `,
    variables: ['companyName', 'companyCode']
  },

  // Company Approval Templates - SMS
  {
    name: 'Company Approved - SMS (Persian)',
    type: 'sms',
    channel: 'company_approval',
    language: 'fa',
    content: 'تبریک! شرکت {{companyName}} در تدبیرخوان تایید شد. کد شرکت: {{companyCode}}. اکنون می‌توانید کارمندان را اضافه کنید.',
    variables: ['companyName', 'companyCode']
  },

  // Menu Published Templates - Email
  {
    name: 'Menu Published - Email (Persian)',
    type: 'email',
    channel: 'menu_published',
    language: 'fa',
    subject: 'منوی جدید منتشر شد - تدبیرخوان',
    content: `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif;">
        <h2>سلام {{userName}}،</h2>
        <p>منوی {{menuDate}} منتشر شد!</p>
        <div style="background: #fff3cd; padding: 15px; margin: 10px 0; border-radius: 5px;">
          <h3>غذاهای امروز:</h3>
          <p>{{menuItems}}</p>
        </div>
        <p>برای سفارش به سایت مراجعه کنید.</p>
        <p>با تشکر،<br>تیم تدبیرخوان</p>
      </div>
    `,
    variables: ['userName', 'menuDate', 'menuItems']
  },

  // Menu Published Templates - SMS
  {
    name: 'Menu Published - SMS (Persian)',
    type: 'sms',
    channel: 'menu_published',
    language: 'fa',
    content: 'سلام {{userName}}، منوی {{menuDate}} منتشر شد. برای سفارش به سایت مراجعه کنید. تدبیرخوان',
    variables: ['userName', 'menuDate']
  },

  // Reminder Templates - Email
  {
    name: 'Order Reminder - Email (Persian)',
    type: 'email',
    channel: 'reminder',
    language: 'fa',
    subject: 'یادآوری سفارش غذا - تدبیرخوان',
    content: `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif;">
        <h2>سلام {{userName}}،</h2>
        <p>یادآوری: مهلت سفارش غذای {{reminderDate}} تا {{deadline}} باقی مانده.</p>
        <div style="background: #d1ecf1; padding: 15px; margin: 10px 0; border-radius: 5px;">
          <p>فراموش نکنید که غذای خود را سفارش دهید!</p>
        </div>
        <p>با تشکر،<br>تیم تدبیرخوان</p>
      </div>
    `,
    variables: ['userName', 'reminderDate', 'deadline']
  },

  // Reminder Templates - SMS
  {
    name: 'Order Reminder - SMS (Persian)',
    type: 'sms',
    channel: 'reminder',
    language: 'fa',
    content: 'سلام {{userName}}، یادآوری: مهلت سفارش غذای {{reminderDate}} تا {{deadline}}. فراموش نکنید! تدبیرخوان',
    variables: ['userName', 'reminderDate', 'deadline']
  }
];

export async function seedDefaultTemplates() {
  try {
    for (const templateData of defaultTemplates) {
      // Check if template already exists
      const existing = await NotificationTemplate.findByChannelAndType(
        templateData.channel,
        templateData.type,
        templateData.language
      );

      if (!existing) {
        await NotificationTemplate.create(templateData);
        console.log(`Created template: ${templateData.name}`);
      } else {
        console.log(`Template already exists: ${templateData.name}`);
      }
    }
    console.log('Default templates seeding completed');
  } catch (error) {
    console.error('Error seeding default templates:', error);
    throw error;
  }
}