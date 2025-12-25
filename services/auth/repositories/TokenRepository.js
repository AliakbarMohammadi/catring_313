class TokenRepository {
  constructor() {
    // In a real implementation, this would use Redis
    // For now, using in-memory storage for demonstration
    this.refreshTokens = new Map(); // userId -> Set of refresh tokens
    this.revokedTokens = new Set(); // Set of revoked access tokens
  }

  async storeRefreshToken(userId, refreshToken) {
    if (!this.refreshTokens.has(userId)) {
      this.refreshTokens.set(userId, new Set());
    }
    
    this.refreshTokens.get(userId).add(refreshToken);
  }

  async isValidRefreshToken(userId, refreshToken) {
    const userTokens = this.refreshTokens.get(userId);
    return userTokens ? userTokens.has(refreshToken) : false;
  }

  async replaceRefreshToken(userId, oldToken, newToken) {
    const userTokens = this.refreshTokens.get(userId);
    
    if (userTokens && userTokens.has(oldToken)) {
      userTokens.delete(oldToken);
      userTokens.add(newToken);
      return true;
    }
    
    return false;
  }

  async revokeToken(userId, token) {
    // Add to revoked tokens set (for access tokens)
    this.revokedTokens.add(token);
    
    // Also remove from refresh tokens if it's a refresh token
    const userTokens = this.refreshTokens.get(userId);
    if (userTokens) {
      userTokens.delete(token);
    }
  }

  async revokeAllUserTokens(userId) {
    // Remove all refresh tokens for user
    this.refreshTokens.delete(userId);
    
    // Note: In a real implementation, we'd also need to add all user's 
    // access tokens to the revoked set, but that requires tracking them
  }

  async isTokenRevoked(token) {
    return this.revokedTokens.has(token);
  }

  // Helper method for testing - clear all tokens
  async clear() {
    this.refreshTokens.clear();
    this.revokedTokens.clear();
  }
}

export default TokenRepository;