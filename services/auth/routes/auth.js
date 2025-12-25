import express from 'express';
import { 
  generateTokens, 
  verifyToken, 
  requireAuth,
  ValidationError,
  AuthenticationError 
} from '@tadbir-khowan/shared';
import AuthService from '../services/AuthService.js';
import { requirePermission, requireOwnership, PERMISSIONS } from '../middleware/rbac.js';

const router = express.Router();
const authService = new AuthService();

// Login endpoint
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const result = await authService.login(email, password);
    
    res.json({
      success: true,
      data: result,
      message: 'Login successful'
    });
  } catch (error) {
    next(error);
  }
});

// Logout endpoint
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const token = req.headers.authorization?.substring(7);
    
    if (token) {
      await authService.logout(token);
    }
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
});

// Token refresh endpoint
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    const result = await authService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      data: result,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get current user profile
router.get('/profile', requireAuth, requirePermission(PERMISSIONS.USER_READ), async (req, res, next) => {
  try {
    const user = await authService.getUserProfile(req.user.userId);
    
    res.json({
      success: true,
      data: user,
      message: 'Profile retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile (users can only update their own profile)
router.put('/profile', requireAuth, requirePermission(PERMISSIONS.USER_WRITE), requireOwnership('userId'), async (req, res, next) => {
  try {
    const updates = req.body;
    const user = await authService.updateUserProfile(req.user.userId, updates);
    
    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Change password (users can only change their own password)
router.post('/change-password', requireAuth, requirePermission(PERMISSIONS.USER_WRITE), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current password and new password are required');
    }

    await authService.changePassword(req.user.userId, currentPassword, newPassword);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;