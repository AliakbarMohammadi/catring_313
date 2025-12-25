import express from 'express';
import { NotificationTemplate } from '../models/NotificationTemplate.js';
import { ValidationError, NotFoundError, createLogger } from '@tadbir-khowan/shared';

const router = express.Router();
const logger = createLogger('template-routes');

// Get all templates
router.get('/', async (req, res, next) => {
  try {
    const { type, channel, language, isActive } = req.query;
    
    const filters = {};
    if (type) filters.type = type;
    if (channel) filters.channel = channel;
    if (language) filters.language = language;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const templates = await NotificationTemplate.findAll(filters);

    res.json({
      success: true,
      templates: templates.map(t => t.toJSON())
    });
  } catch (error) {
    next(error);
  }
});

// Get template by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const template = await NotificationTemplate.findById(id);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    res.json({
      success: true,
      template: template.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// Create new template
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      type,
      channel,
      language,
      subject,
      content,
      variables,
      isActive
    } = req.body;

    // Validation
    if (!name || !type || !channel || !content) {
      throw new ValidationError('name, type, channel, and content are required');
    }

    const validTypes = ['email', 'sms'];
    if (!validTypes.includes(type)) {
      throw new ValidationError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    const validChannels = ['order_status', 'company_approval', 'menu_published', 'reminder'];
    if (!validChannels.includes(channel)) {
      throw new ValidationError(`Invalid channel. Must be one of: ${validChannels.join(', ')}`);
    }

    if (type === 'email' && !subject) {
      throw new ValidationError('subject is required for email templates');
    }

    const template = await NotificationTemplate.create({
      name,
      type,
      channel,
      language: language || 'fa',
      subject,
      content,
      variables: variables || [],
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      template: template.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// Update template
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const template = await NotificationTemplate.findById(id);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    // Validate type and channel if provided
    if (updateData.type) {
      const validTypes = ['email', 'sms'];
      if (!validTypes.includes(updateData.type)) {
        throw new ValidationError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
      }
    }

    if (updateData.channel) {
      const validChannels = ['order_status', 'company_approval', 'menu_published', 'reminder'];
      if (!validChannels.includes(updateData.channel)) {
        throw new ValidationError(`Invalid channel. Must be one of: ${validChannels.join(', ')}`);
      }
    }

    // If changing to email type, ensure subject is provided
    if (updateData.type === 'email' && !updateData.subject && !template.subject) {
      throw new ValidationError('subject is required for email templates');
    }

    await template.update(updateData);

    res.json({
      success: true,
      template: template.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// Delete template
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const template = await NotificationTemplate.findById(id);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    await template.delete();

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Test template rendering
router.post('/:id/test', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    const template = await NotificationTemplate.findById(id);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    const rendered = template.renderContent(variables || {});

    res.json({
      success: true,
      rendered: {
        subject: rendered.subject,
        content: rendered.content
      },
      variables: variables || {}
    });
  } catch (error) {
    next(error);
  }
});

export default router;