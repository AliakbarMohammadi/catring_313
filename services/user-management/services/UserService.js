import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/UserRepository.js';
import { CompanyRepository } from '../repositories/CompanyRepository.js';
import { 
  ValidationError, 
  BusinessLogicError, 
  NotFoundError,
  USER_TYPES 
} from '@tadbir-khowan/shared';

export class UserService {
  constructor() {
    this.userRepository = new UserRepository();
    this.companyRepository = new CompanyRepository();
  }

  async registerUser(userData) {
    const { email, password, firstName, lastName, phone, userType, companyCode } = userData;

    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new BusinessLogicError('Email already registered');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    let companyId = null;

    // Handle employee registration with company code
    if (userType === USER_TYPES.EMPLOYEE && companyCode) {
      const company = await this.companyRepository.findByCompanyCode(companyCode);
      if (!company) {
        throw new BusinessLogicError('Invalid company code');
      }
      companyId = company.id;
    }

    // Create user
    const newUser = await this.userRepository.create({
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      userType,
      companyId,
      isActive: true,
      emailVerified: false,
      phoneVerified: false
    });

    // Remove password hash from response
    const { password_hash, ...userResponse } = newUser;
    return userResponse;
  }

  async getUserProfile(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Remove sensitive information
    const { password_hash, ...userProfile } = user;
    return userProfile;
  }

  async updateUserProfile(userId, updateData) {
    const { firstName, lastName, phone } = updateData;

    const allowedUpdates = {};
    if (firstName !== undefined) allowedUpdates.first_name = firstName;
    if (lastName !== undefined) allowedUpdates.last_name = lastName;
    if (phone !== undefined) allowedUpdates.phone = phone;

    if (Object.keys(allowedUpdates).length === 0) {
      throw new ValidationError('No valid fields provided for update');
    }

    const updatedUser = await this.userRepository.update(userId, allowedUpdates);
    
    // Remove sensitive information
    const { password_hash, ...userProfile } = updatedUser;
    return userProfile;
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get user with password hash for verification
    const userWithPassword = await this.userRepository.findByEmail(user.email);
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password_hash);
    if (!isCurrentPasswordValid) {
      throw new BusinessLogicError('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.userRepository.updatePassword(userId, newPasswordHash);

    return { message: 'Password updated successfully' };
  }

  async addEmployeesToCompany(companyId, employees, adminUserId) {
    // Verify that the admin user is actually the admin of this company
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    if (company.admin_user_id !== adminUserId) {
      throw new BusinessLogicError('Only company admin can add employees');
    }

    if (company.status !== 'approved') {
      throw new BusinessLogicError('Company must be approved to add employees');
    }

    const results = [];
    const errors = [];

    for (const employee of employees) {
      try {
        const { email, firstName, lastName, phone } = employee;

        // Check if email already exists
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
          errors.push({ email, error: 'Email already registered' });
          continue;
        }

        // Generate temporary password
        const tempPassword = this.generateTemporaryPassword();
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

        // Create employee user
        const newEmployee = await this.userRepository.create({
          email,
          passwordHash,
          firstName,
          lastName,
          phone,
          userType: USER_TYPES.EMPLOYEE,
          companyId,
          isActive: true,
          emailVerified: false,
          phoneVerified: false
        });

        // Remove password hash from response but include temp password for notification
        const { password_hash, ...employeeResponse } = newEmployee;
        results.push({ ...employeeResponse, temporaryPassword: tempPassword });

      } catch (error) {
        errors.push({ email: employee.email, error: error.message });
      }
    }

    return { 
      successful: results, 
      failed: errors,
      summary: {
        total: employees.length,
        successful: results.length,
        failed: errors.length
      }
    };
  }

  async getCompanyEmployees(companyId, adminUserId, page = 1, limit = 50) {
    // Verify that the admin user is actually the admin of this company
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    if (company.admin_user_id !== adminUserId) {
      throw new BusinessLogicError('Only company admin can view employees');
    }

    const offset = (page - 1) * limit;
    const employees = await this.userRepository.findByCompanyId(companyId, limit, offset);
    const totalCount = await this.userRepository.countByCompanyId(companyId);

    return {
      employees: employees.map(emp => {
        const { password_hash, ...employeeData } = emp;
        return employeeData;
      }),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  async deactivateUser(userId, adminUserId) {
    // This method can be called by catering managers or company admins
    const adminUser = await this.userRepository.findById(adminUserId);
    if (!adminUser) {
      throw new NotFoundError('Admin user not found');
    }

    const targetUser = await this.userRepository.findById(userId);
    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    // Check permissions
    if (adminUser.user_type === USER_TYPES.CATERING_MANAGER) {
      // Catering managers can deactivate any user
    } else if (adminUser.user_type === USER_TYPES.COMPANY_ADMIN) {
      // Company admins can only deactivate users in their company
      if (targetUser.company_id !== adminUser.company_id) {
        throw new BusinessLogicError('Company admin can only deactivate employees in their company');
      }
    } else {
      throw new BusinessLogicError('Insufficient permissions to deactivate user');
    }

    const updatedUser = await this.userRepository.update(userId, { is_active: false });
    const { password_hash, ...userResponse } = updatedUser;
    return userResponse;
  }

  generateTemporaryPassword() {
    // Generate a secure temporary password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async validateUserExists(userId) {
    const user = await this.userRepository.findById(userId);
    return !!user;
  }

  async getUsersByIds(userIds) {
    const users = [];
    for (const id of userIds) {
      const user = await this.userRepository.findById(id);
      if (user) {
        const { password_hash, ...userData } = user;
        users.push(userData);
      }
    }
    return users;
  }
}