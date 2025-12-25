const { UserService } = require('../services/UserService.js');

describe('User Service Basic Tests', () => {
  test('UserService can be instantiated', () => {
    const userService = new UserService();
    expect(userService).toBeDefined();
  });
});