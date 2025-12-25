import { 
  generateTokens, 
  verifyToken, 
  comparePassword, 
  hashPassword,
  AuthenticationError,
  ValidationError,
  NotFoundError 
} from '@tadbir-khowan/shared';
import UserRepository from '../repositories/UserRepository.js';
import TokenRepository from '../repositories/TokenRepository.js';

class AuthService {
  constructor() {
    this.userRepository = new UserRepository();
    this.tokenRepository = new TokenRepository();
  }

  async login(email, password) {
    // Find user by email
    const user = await this.userRepository.findByEmail(email);
    
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      userType: user.userType,
      companyId: user.companyId,
      tenantId: user.tenantId
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    // Store refresh token
    await this.tokenRepository.storeRefreshToken(user.id, refreshToken);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
      expiresIn: '24h'
    };
  }

  async logout(token) {
    try {
      const decoded = verifyToken(token);
      await this.tokenRepository.revokeToken(decoded.userId, token);
    } catch (error) {
      // Token might be invalid, but logout should still succeed
      console.warn('Error during logout:', error.message);
    }
  }

  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = verifyToken(refreshToken);
      
      // Check if refresh token exists in storage
      const isValidRefreshToken = await this.tokenRepository.isValidRefreshToken(
        decoded.userId, 
        refreshToken
      );
      
      if (!isValidRefreshToken) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Get current user data
      const user = await this.userRepository.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new AuthenticationError('User not found or inactive');
      }

      // Generate new tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        userType: user.userType,
        companyId: user.companyId,
        tenantId: user.tenantId
      };

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenPayload);

      // Replace old refresh token with new one
      await this.tokenRepository.replaceRefreshToken(
        decoded.userId, 
        refreshToken, 
        newRefreshToken
      );

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: '24h'
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }

  async getUserProfile(userId) {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUserProfile(userId, updates) {
    // Validate updates - don't allow changing sensitive fields
    const allowedFields = ['firstName', 'lastName', 'phone'];
    const filteredUpdates = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    const user = await this.userRepository.updateById(userId, filteredUpdates);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.userRepository.findById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long');
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await this.userRepository.updateById(userId, { password: hashedNewPassword });

    // Revoke all existing tokens to force re-login
    await this.tokenRepository.revokeAllUserTokens(userId);
  }
}

export default AuthService;