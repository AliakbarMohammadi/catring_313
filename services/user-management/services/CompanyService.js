import { CompanyRepository } from '../repositories/CompanyRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { 
  ValidationError, 
  BusinessLogicError, 
  NotFoundError,
  USER_TYPES,
  COMPANY_STATUS 
} from '@tadbir-khowan/shared';

export class CompanyService {
  constructor() {
    this.companyRepository = new CompanyRepository();
    this.userRepository = new UserRepository();
  }

  async registerCompany(companyData, adminUserId) {
    const { 
      name, 
      registrationNumber, 
      address, 
      contactPerson, 
      email, 
      phone 
    } = companyData;

    // Verify that the admin user exists and is a company admin
    const adminUser = await this.userRepository.findById(adminUserId);
    if (!adminUser) {
      throw new NotFoundError('Admin user not found');
    }

    if (adminUser.user_type !== USER_TYPES.COMPANY_ADMIN) {
      throw new BusinessLogicError('Only company admin users can register companies');
    }

    // Check if admin user is already associated with another company
    if (adminUser.company_id) {
      throw new BusinessLogicError('User is already associated with a company');
    }

    // Check if registration number already exists
    const existingCompany = await this.companyRepository.registrationNumberExists(registrationNumber);
    if (existingCompany) {
      throw new BusinessLogicError('Registration number already exists');
    }

    // Generate unique company code
    const companyCode = await this.companyRepository.generateUniqueCompanyCode();

    // Create company
    const newCompany = await this.companyRepository.create({
      name,
      registrationNumber,
      address,
      contactPerson,
      email,
      phone,
      adminUserId,
      companyCode
    });

    return newCompany;
  }

  async getPendingCompanies(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const companies = await this.companyRepository.findByStatus(COMPANY_STATUS.PENDING, limit, offset);
    const totalCount = await this.companyRepository.countByStatus(COMPANY_STATUS.PENDING);

    return {
      companies,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  async approveCompany(companyId, cateringManagerId) {
    // Verify that the user is a catering manager
    const cateringManager = await this.userRepository.findById(cateringManagerId);
    if (!cateringManager) {
      throw new NotFoundError('Catering manager not found');
    }

    if (cateringManager.user_type !== USER_TYPES.CATERING_MANAGER) {
      throw new BusinessLogicError('Only catering managers can approve companies');
    }

    // Get company details
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    if (company.status !== COMPANY_STATUS.PENDING) {
      throw new BusinessLogicError('Company is not in pending status');
    }

    // Approve company
    const approvedCompany = await this.companyRepository.updateStatus(companyId, COMPANY_STATUS.APPROVED);

    // Update admin user's company_id
    if (company.admin_user_id) {
      await this.userRepository.update(company.admin_user_id, { 
        company_id: companyId 
      });
    }

    return approvedCompany;
  }

  async rejectCompany(companyId, cateringManagerId, rejectionReason) {
    // Verify that the user is a catering manager
    const cateringManager = await this.userRepository.findById(cateringManagerId);
    if (!cateringManager) {
      throw new NotFoundError('Catering manager not found');
    }

    if (cateringManager.user_type !== USER_TYPES.CATERING_MANAGER) {
      throw new BusinessLogicError('Only catering managers can reject companies');
    }

    // Get company details
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    if (company.status !== COMPANY_STATUS.PENDING) {
      throw new BusinessLogicError('Company is not in pending status');
    }

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new ValidationError('Rejection reason is required');
    }

    // Reject company
    const rejectedCompany = await this.companyRepository.updateStatus(
      companyId, 
      COMPANY_STATUS.REJECTED, 
      rejectionReason
    );

    return rejectedCompany;
  }

  async getCompanyById(companyId, requestingUserId) {
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Check permissions
    const requestingUser = await this.userRepository.findById(requestingUserId);
    if (!requestingUser) {
      throw new NotFoundError('Requesting user not found');
    }

    // Catering managers can view any company
    if (requestingUser.user_type === USER_TYPES.CATERING_MANAGER) {
      return company;
    }

    // Company admins can only view their own company
    if (requestingUser.user_type === USER_TYPES.COMPANY_ADMIN) {
      if (company.admin_user_id !== requestingUserId) {
        throw new BusinessLogicError('Company admin can only view their own company');
      }
      return company;
    }

    // Employees can view their company
    if (requestingUser.user_type === USER_TYPES.EMPLOYEE) {
      if (requestingUser.company_id !== companyId) {
        throw new BusinessLogicError('Employee can only view their own company');
      }
      return company;
    }

    throw new BusinessLogicError('Insufficient permissions to view company');
  }

  async updateCompany(companyId, updateData, requestingUserId) {
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Check permissions - only company admin or catering manager can update
    const requestingUser = await this.userRepository.findById(requestingUserId);
    if (!requestingUser) {
      throw new NotFoundError('Requesting user not found');
    }

    const canUpdate = 
      requestingUser.user_type === USER_TYPES.CATERING_MANAGER ||
      (requestingUser.user_type === USER_TYPES.COMPANY_ADMIN && company.admin_user_id === requestingUserId);

    if (!canUpdate) {
      throw new BusinessLogicError('Insufficient permissions to update company');
    }

    // Only allow updating certain fields
    const allowedFields = ['name', 'address', 'contactPerson', 'email', 'phone'];
    const filteredUpdateData = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        filteredUpdateData[key] = updateData[key];
      }
    });

    if (Object.keys(filteredUpdateData).length === 0) {
      throw new ValidationError('No valid fields provided for update');
    }

    const updatedCompany = await this.companyRepository.update(companyId, filteredUpdateData);
    return updatedCompany;
  }

  async getApprovedCompanies(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const companies = await this.companyRepository.findByStatus(COMPANY_STATUS.APPROVED, limit, offset);
    const totalCount = await this.companyRepository.countByStatus(COMPANY_STATUS.APPROVED);

    return {
      companies,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  async validateCompanyCode(companyCode) {
    const company = await this.companyRepository.findByCompanyCode(companyCode);
    return {
      valid: !!company,
      company: company || null
    };
  }

  async getCompanyStats(companyId, requestingUserId) {
    // Verify permissions
    const company = await this.getCompanyById(companyId, requestingUserId);
    
    const employeeCount = await this.userRepository.countByCompanyId(companyId);
    
    return {
      companyId,
      companyName: company.name,
      employeeCount,
      status: company.status,
      createdAt: company.created_at,
      approvedAt: company.approved_at
    };
  }
}