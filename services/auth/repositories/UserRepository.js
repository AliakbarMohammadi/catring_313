import { NotFoundError } from '@tadbir-khowan/shared';

class UserRepository {
  constructor() {
    // In a real implementation, this would connect to PostgreSQL
    // For now, using in-memory storage for demonstration
    this.users = new Map();
    this.usersByEmail = new Map();
  }

  async findById(id) {
    return this.users.get(id) || null;
  }

  async findByEmail(email) {
    const userId = this.usersByEmail.get(email.toLowerCase());
    return userId ? this.users.get(userId) : null;
  }

  async create(userData) {
    const id = this.generateId();
    const user = {
      id,
      ...userData,
      email: userData.email.toLowerCase(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(id, user);
    this.usersByEmail.set(user.email, id);
    
    return user;
  }

  async updateById(id, updates) {
    const user = this.users.get(id);
    
    if (!user) {
      return null;
    }

    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date()
    };

    this.users.set(id, updatedUser);
    
    return updatedUser;
  }

  async deleteById(id) {
    const user = this.users.get(id);
    
    if (!user) {
      return false;
    }

    this.users.delete(id);
    this.usersByEmail.delete(user.email);
    
    return true;
  }

  generateId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Helper method for testing - add a user directly
  async addUser(user) {
    const id = user.id || this.generateId();
    const userWithId = { ...user, id };
    this.users.set(id, userWithId);
    this.usersByEmail.set(user.email.toLowerCase(), id);
    return userWithId;
  }

  // Helper method for testing - clear all users
  async clear() {
    this.users.clear();
    this.usersByEmail.clear();
  }
}

export default UserRepository;